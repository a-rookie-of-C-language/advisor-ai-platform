from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]


def _ensure_sys_path() -> None:
    """确保 ROOT 在 sys.path 中。"""
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))


def _load_env() -> None:
    """加载 .env 配置。"""
    try:
        from dotenv import load_dotenv
        load_dotenv(ROOT / ".env")
    except ImportError:
        pass


class EvalRunner:
    """全链路评估运行器。"""

    def __init__(
        self,
        dataset_path: str | Path,
        kb_id: int | None = None,
        top_k: int = 5,
        llm_provider: Any = None,
    ) -> None:
        from .dataset import EvalDataset

        _ensure_sys_path()
        _load_env()

        self._dataset = EvalDataset.load(dataset_path)
        self._kb_id = kb_id or self._dataset.kb_id
        self._top_k = top_k
        self._llm_provider = llm_provider
        self._rag_service = None
        self._annotation_pipeline = None

    def _get_rag_service(self) -> Any:
        """延迟初始化 RAG_service。"""
        if self._rag_service is None:
            from RAG.RAG_service import RAG_service

            db_dsn = os.getenv("DATABASE_URL", "").strip()
            if not db_dsn:
                raise RuntimeError("未配置 DATABASE_URL")

            self._rag_service = RAG_service(
                db_dsn=db_dsn,
                ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
                embedding_model=os.getenv("EMBEDDING_MODEL", "bge-m3"),
            )
        return self._rag_service

    def _get_annotation_pipeline(self) -> Any:
        """延迟初始化 AnnotationPipeline。"""
        if self._annotation_pipeline is None:
            from RAG.annotator.annotation_pipeline import AnnotationPipeline
            from RAG.annotator.rule_annotator import RuleAnnotator

            # 默认只用规则引擎，HanLP 和 LLM 按需添加
            annotators = [RuleAnnotator()]

            # 如果配置了 HanLP，添加 HanLP 标注器
            try:
                from RAG.annotator.hanlp_annotator import HanlpAnnotator
                annotators.append(HanlpAnnotator())
            except Exception:
                logger.debug("HanLP 未启用，跳过")

            # 如果配置了 LLM，添加 LLM 标注器
            try:
                from RAG.annotator.llm_annotator import LlmAnnotator
                annotators.append(LlmAnnotator())
            except Exception:
                logger.debug("LLM 标注器未启用，跳过")

            self._annotation_pipeline = AnnotationPipeline(annotators=annotators)
        return self._annotation_pipeline

    def _get_chat_service(self) -> Any:
        """创建 ChatStreamService 实例。"""
        from chat.stream_service import ChatStreamService
        from llm.provider_factory import build_provider_from_env

        provider = self._llm_provider or build_provider_from_env()
        return ChatStreamService(provider=provider)

    async def run_all(self) -> dict[str, Any]:
        """执行全部评估，返回完整报告。"""
        from .report import EvalReport

        report = EvalReport.create(
            dataset_name=self._dataset.name,
            config={"kb_id": self._kb_id, "top_k": self._top_k},
        )

        for case in self._dataset.cases:
            logger.info("评估 case: %s - %s", case.id, case.query[:50])
            case_result = {"id": case.id, "query": case.query, "tags": case.tags}

            # 检索评估
            case_result["retrieval"] = await self._eval_retrieval(case.query)

            # 标注评估（如果有期望标注）
            if case.expected_annotation:
                case_result["annotation"] = await self._eval_annotation(case.query)

            # 融合评估
            case_result["fusion"] = await self._eval_fusion(case.query)

            # 端到端评估（如果有期望答案）
            if case.expected_answer:
                case_result["e2e"] = await self._eval_e2e(
                    case.query, case.expected_answer
                )

            report.add_case_result(case_result)

        report.compute_summary()
        return asdict(report)

    async def _eval_retrieval(self, query: str) -> dict[str, Any]:
        """评估 RAG 检索质量。"""
        from .metrics.retrieval import retrieval_mrr, retrieval_ndcg, retrieval_recall_at_k

        # TODO: 调用 RAG_service.rag_search 获取检索结果
        # 暂时返回模拟数据，实际实现需要连接 RAG 服务
        retrieved_chunks = await self._rag_search(query)

        # 获取期望的 chunk_ids（需要从 dataset 中对应）
        expected_chunks = []
        for case in self._dataset.cases:
            if case.query == query:
                expected_chunks = case.expected_chunks
                break

        return {
            "recall@5": retrieval_recall_at_k(retrieved_chunks, expected_chunks, k=self._top_k),
            "mrr": retrieval_mrr(retrieved_chunks, expected_chunks),
            "ndcg@5": retrieval_ndcg(retrieved_chunks, expected_chunks, k=self._top_k),
            "retrieved_count": len(retrieved_chunks),
            "expected_count": len(expected_chunks),
        }

    async def _eval_annotation(self, query: str) -> dict[str, Any]:
        """评估元数据标注质量。"""
        from .metrics.annotation import annotation_accuracy

        # 对检索到的切片进行标注
        # TODO: 实际实现需要调用 AnnotationPipeline
        predicted_annotation = await self._annotate_chunks(query)

        # 获取期望标注
        expected_annotation = {}
        for case in self._dataset.cases:
            if case.query == query:
                expected_annotation = case.expected_annotation
                break

        if not expected_annotation:
            return {"error": "no_expected_annotation"}

        return annotation_accuracy(predicted_annotation, expected_annotation)

    async def _eval_fusion(self, query: str) -> dict[str, Any]:
        """评估融合策略效果。"""
        from .metrics.fusion import fusion_score_comparison

        # 获取融合前后的候选列表
        candidates_before, candidates_after = await self._run_fusion_comparison(query)

        return fusion_score_comparison(candidates_before, candidates_after, top_k=self._top_k)

    async def _eval_e2e(self, query: str, expected_answer: str) -> dict[str, Any]:
        """评估端到端回答质量。"""
        from .metrics.e2e import e2e_judge_score

        # 获取实际回答
        actual_answer = await self._get_agent_answer(query)

        return await e2e_judge_score(
            query=query,
            expected_answer=expected_answer,
            actual_answer=actual_answer,
            llm_provider=self._llm_provider,
        )

    async def _rag_search(self, query: str) -> list[str]:
        """调用 RAG 检索，返回 chunk_id 列表。"""
        try:
            from RAG.schema import RAGSearchRequest, SearchMode

            rag = self._get_rag_service()
            response = rag.rag_search(RAGSearchRequest(
                query=query,
                kb_id=self._kb_id,
                top_k=self._top_k,
                mode=SearchMode.dense,
                use_rerank=True,
                rewrite_query=False,
            ))
            return [hit.chunk_id for hit in response.items] if response.ok else []
        except Exception as exc:
            logger.warning("RAG 检索失败: %s", exc)
            return []

    async def _annotate_chunks(self, query: str) -> dict[str, Any]:
        """对检索到的切片进行标注。"""
        try:
            # 先检索相关切片
            retrieved_chunks = await self._rag_search(query)
            if not retrieved_chunks:
                return {"type": "general", "authority": "secondary", "effective_date": ""}

            # 获取切片文本
            from RAG.schema import RAGSearchRequest, SearchMode

            rag = self._get_rag_service()
            response = rag.rag_search(RAGSearchRequest(
                query=query,
                kb_id=self._kb_id,
                top_k=1,  # 只取第一个切片做标注评估
                mode=SearchMode.dense,
                use_rerank=True,
                rewrite_query=False,
            ))

            if not response.ok or not response.items:
                return {"type": "general", "authority": "secondary", "effective_date": ""}

            # 对第一个切片进行标注
            text = response.items[0].text
            pipeline = self._get_annotation_pipeline()
            ann = pipeline.annotate_chunk(text)

            return {
                "type": ann.type,
                "authority": ann.authority,
                "effective_date": ann.effective_date,
                "confidence": ann.confidence,
                "source": ann.source,
            }
        except Exception as exc:
            logger.warning("标注评估失败: %s", exc)
            return {"type": "general", "authority": "secondary", "effective_date": ""}

    async def _run_fusion_comparison(
        self, query: str
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """运行融合前后对比。"""
        # TODO: 实际实现需要调用 fusion pipeline
        # 暂时返回模拟数据
        return [], []

    async def _get_agent_answer(self, query: str) -> str:
        """获取 agent 的回答。"""
        try:
            from llm.chat_message import ChatMessage

            service = self._get_chat_service()
            messages = [ChatMessage(role="user", content=query)]

            answer_chunks = []
            async for event in service.stream_events(
                messages=messages,
                user_id=0,
                session_id=0,
                kb_id=self._kb_id,
            ):
                # 解析 SSE 格式
                if event.startswith("data: "):
                    data_str = event[6:].strip()
                    if data_str:
                        try:
                            import json
                            data = json.loads(data_str)
                            if data.get("type") == "delta":
                                answer_chunks.append(data.get("content", ""))
                        except json.JSONDecodeError:
                            pass

            return "".join(answer_chunks) if answer_chunks else "无回答"
        except Exception as exc:
            logger.warning("获取 agent 回答失败: %s", exc)
            return f"错误: {exc}"


def asdict(obj: Any) -> Any:
    """递归转换为字典（支持 dataclass 和普通对象）。"""
    if hasattr(obj, "__dataclass_fields__"):
        from dataclasses import asdict as dc_asdict
        return dc_asdict(obj)
    elif isinstance(obj, dict):
        return {k: asdict(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [asdict(item) for item in obj]
    return obj


def main() -> None:
    """CLI 入口。"""
    parser = argparse.ArgumentParser(description="Agent 全链路评估")
    parser.add_argument("--dataset", type=str, required=True, help="测试集 JSON 文件路径")
    parser.add_argument("--kb-id", type=int, default=None, help="知识库 ID")
    parser.add_argument("--top-k", type=int, default=5, help="检索 top-K")
    parser.add_argument("--output", type=str, default="eval_report.json", help="输出报告路径")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    async def _run():
        runner = EvalRunner(
            dataset_path=args.dataset,
            kb_id=args.kb_id,
            top_k=args.top_k,
        )
        report = await runner.run_all()

        from .report import save_json
        save_json(report, args.output)
        logger.info("评估完成，报告已保存到: %s", args.output)

    asyncio.run(_run())


if __name__ == "__main__":
    main()
