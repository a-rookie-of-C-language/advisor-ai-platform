from __future__ import annotations

import math


def retrieval_recall_at_k(
    retrieved: list[str],
    expected: list[str],
    k: int = 5,
) -> float:
    """计算 Recall@K：前 K 个结果中命中 expected 的比例。

    Args:
        retrieved: 检索返回的 chunk_id 列表（按相关性排序）
        expected: 期望命中的 chunk_id 列表
        k: 取前 K 个结果

    Returns:
        Recall@K 值，范围 [0, 1]
    """
    if not expected:
        return 0.0
    retrieved_set = set(retrieved[:k])
    expected_set = set(expected)
    hits = len(retrieved_set & expected_set)
    return hits / len(expected_set)


def retrieval_mrr(
    retrieved: list[str],
    expected: list[str],
) -> float:
    """计算 MRR（Mean Reciprocal Rank）：第一个命中结果的倒数排名。

    Args:
        retrieved: 检索返回的 chunk_id 列表（按相关性排序）
        expected: 期望命中的 chunk_id 列表

    Returns:
        MRR 值，范围 [0, 1]
    """
    if not expected:
        return 0.0
    expected_set = set(expected)
    for i, chunk_id in enumerate(retrieved):
        if chunk_id in expected_set:
            return 1.0 / (i + 1)
    return 0.0


def retrieval_ndcg(
    retrieved: list[str],
    expected: list[str],
    k: int = 5,
) -> float:
    """计算 NDCG@K（Normalized Discounted Cumulative Gain）。

    Args:
        retrieved: 检索返回的 chunk_id 列表（按相关性排序）
        expected: 期望命中的 chunk_id 列表
        k: 取前 K 个结果

    Returns:
        NDCG@K 值，范围 [0, 1]
    """
    if not expected:
        return 0.0

    expected_set = set(expected)

    # DCG: 命中的位置越靠前，增益越高
    dcg = 0.0
    for i, chunk_id in enumerate(retrieved[:k]):
        if chunk_id in expected_set:
            dcg += 1.0 / math.log2(i + 2)  # i+2 因为 log2(1) = 0

    # IDCG: 理想情况下的 DCG（所有 expected 都在最前面）
    ideal_count = min(len(expected_set), k)
    idcg = sum(1.0 / math.log2(i + 2) for i in range(ideal_count))

    if idcg == 0:
        return 0.0

    return dcg / idcg
