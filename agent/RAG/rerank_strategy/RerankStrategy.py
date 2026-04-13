from abc import ABC, abstractmethod
from typing import List, Tuple


class RerankStrategy(ABC):
    """重排序策略抽象基类。

    检索到候选文本块后，可通过重排序提升结果质量。
    子类可接入 bge-reranker、cross-encoder 等模型。
    """

    @abstractmethod
    def rerank(self, query: str, candidates: List[str]) -> List[Tuple[str, float]]:
        """对候选文本块重排序。

        Args:
            query: 用户查询文本
            candidates: 候选文本块列表

        Returns:
            按相关度降序排列的 (文本, 分数) 列表
        """


class NoOpRerankStrategy(RerankStrategy):
    """默认无操作重排序策略（保持原始顺序，分数均为1.0）。

    在引入真实重排序模型前作为占位使用。
    """

    def rerank(self, query: str, candidates: List[str]) -> List[Tuple[str, float]]:
        return [(text, 1.0) for text in candidates]
