from __future__ import annotations

from tools.base_tool import BaseTool
from RAG.RAG_service import RAG_service
from RAG.schema import RAGSearchRequest, SearchMode


class RAGTool(BaseTool):
    """RAG 检索工具，供 Agent 根据查询从知识库中检索相关文档片段。"""

    def __init__(
        self,
        db_dsn: str,
        default_kb_id: int = 1,
        top_k: int = 5,
        use_rerank: bool = True,
        mode: SearchMode = SearchMode.dense,
    ) -> None:
        super().__init__(
            name="rag_search",
            description=(
                "从指定知识库检索与问题最相关的文档片段，返回带来源的文本内容。"
                "输入参数：query（查询文本），kb_id（知识库ID，默认1），top_k（返回条数，默认5）。"
            ),
        )
        self._service = RAG_service(db_dsn=db_dsn)
        self._default_kb_id = default_kb_id
        self._top_k = top_k
        self._use_rerank = use_rerank
        self._mode = mode

    def run(self, query: str, kb_id: int | None = None, top_k: int | None = None) -> str:
        """执行 RAG 检索，返回格式化的文本片段字符串。"""
        request = RAGSearchRequest(
            query=query,
            kb_id=kb_id if kb_id is not None else self._default_kb_id,
            top_k=top_k if top_k is not None else self._top_k,
            mode=self._mode,
            use_rerank=self._use_rerank,
        )
        result = self._service.rag_search(request)

        if not result.ok:
            err = result.error
            msg = f"{err.code}: {err.message}" if err else "unknown error"
            return f"[RAG检索失败] {msg}"

        if not result.items:
            return "[RAG检索] 未找到相关内容"

        parts = []
        for hit in result.items:
            parts.append(f"[{hit.rank}] 来源：{hit.source}\n{hit.text}")

        return "\n\n".join(parts)

    def close(self) -> None:
        self._service.close()
