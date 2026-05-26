from __future__ import annotations

import argparse
import asyncio
import logging
from pathlib import Path

from evaluation.agent_answer import collect_agent_answer
from evaluation.case_expectations import (
    find_expected_annotation,
    find_expected_chunks,
)
from evaluation.runner_runtime import (
    build_annotation_pipeline,
    build_chat_service,
    build_rag_service_from_env,
    ensure_sys_path,
    load_env,
)
from evaluation.serialization import to_jsonable
from json_types import JsonObject
from llm.base_provider import BaseLLMProvider

logger = logging.getLogger(__name__)


class EvalRunner:
    """全链路评估运行器。"""

    def __init__(
        self,
        dataset_path: str | Path,
        kb_id: int | None = None,
        top_k: int = 5,
        llm_provider: BaseLLMProvider | None = None,
    ) -> None:
        from .EvalDataset import EvalDataset

        ensure_sys_path()
        load_env()

        self._dataset = EvalDataset.load(dataset_path)
        self._kb_id = kb_id or self._dataset.kb_id
        self._top_k = top_k
        self._llm_provider = llm_provider
        self._rag_service = None
        self._annotation_pipeline = None

    def _get_rag_service(self):
        """延迟初始化 RAG_service。"""
        if self._rag_service is None:
            self._rag_service = build_rag_service_from_env()
        return self._rag_service

    def _get_annotation_pipeline(self):
        """延迟初始化 AnnotationPipeline。"""
        if self._annotation_pipeline is None:
            self._annotation_pipeline = build_annotation_pipeline(logger)
        return self._annotation_pipeline

    def _get_chat_service(self):
        """创建 ChatStreamService 实例。"""
        return build_chat_service(self._llm_provider)

    async def run_all(self) -> JsonObject:
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
        return to_jsonable(report)

    async def _eval_retrieval(self, query: str) -> JsonObject:
        """评估 RAG 检索质量。"""
        from .metrics.retrieval import retrieval_mrr, retrieval_ndcg, retrieval_recall_at_k

        retrieved_chunks = await self._rag_search(query)

        expected_chunks = find_expected_chunks(self._dataset.cases, query)

        return {
            "recall@5": retrieval_recall_at_k(retrieved_chunks, expected_chunks, k=self._top_k),
            "mrr": retrieval_mrr(retrieved_chunks, expected_chunks),
            "ndcg@5": retrieval_ndcg(retrieved_chunks, expected_chunks, k=self._top_k),
            "retrieved_count": len(retrieved_chunks),
            "expected_count": len(expected_chunks),
        }

    async def _eval_annotation(self, query: str) -> JsonObject:
        """评估元数据标注质量。"""
        from .metrics.annotation import annotation_accuracy

        predicted_annotation = await self._annotate_chunks(query)

        expected_annotation = find_expected_annotation(self._dataset.cases, query)

        if not expected_annotation:
            return {"error": "no_expected_annotation"}

        return annotation_accuracy(predicted_annotation, expected_annotation)

    async def _eval_fusion(self, query: str) -> JsonObject:
        """评估融合策略效果。"""
        from .metrics.fusion import fusion_score_comparison

        # 获取融合前后的候选列表
        candidates_before, candidates_after = await self._run_fusion_comparison(query)

        return fusion_score_comparison(candidates_before, candidates_after, top_k=self._top_k)

    async def _eval_e2e(self, query: str, expected_answer: str) -> JsonObject:
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

    async def _annotate_chunks(self, query: str) -> JsonObject:
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
    ) -> tuple[list[JsonObject], list[JsonObject]]:
        """运行融合前后对比，返回（融合前候选, 融合后候选）。"""
        from RAG.schema import RAGSearchRequest, SearchMode

        # 融合前：只做 RAG 检索
        candidates_before: list[JsonObject] = []
        try:
            rag = self._get_rag_service()
            response = rag.rag_search(RAGSearchRequest(
                query=query,
                kb_id=self._kb_id,
                top_k=self._top_k,
                mode=SearchMode.dense,
                use_rerank=True,
                rewrite_query=False,
            ))
            if response.ok:
                for hit in response.items:
                    candidates_before.append({
                        "content": hit.text,
                        "source": "rag",
                        "score": hit.score,
                    })
        except Exception as exc:
            logger.warning("融合前检索失败: %s", exc)

        # 融合后：调用 fusion pipeline
        candidates_after: list[JsonObject] = []
        try:
            from graph.fusion_context_flow import run_fusion_pipeline
            from graph.state import GraphState

            state = GraphState()
            state.set("user_id", 0)
            state.set("session_id", 0)
            state.set("kb_id", self._kb_id)

            fusion_result = await run_fusion_pipeline(state, query, [])
            if fusion_result and fusion_result.get("candidates"):
                for c in fusion_result["candidates"]:
                    candidates_after.append({
                        "content": c.content,
                        "source": c.source,
                        "score": getattr(c, "score", 1.0),
                    })
        except Exception as exc:
            logger.warning("fusion pipeline 执行失败: %s", exc)

        return candidates_before, candidates_after

    async def _get_agent_answer(self, query: str) -> str:
        """获取 agent 的回答。"""
        try:
            service = self._get_chat_service()
            return await collect_agent_answer(service, query=query, kb_id=self._kb_id)
        except Exception as exc:
            logger.warning("获取 agent 回答失败: %s", exc)
            return f"错误: {exc}"


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
