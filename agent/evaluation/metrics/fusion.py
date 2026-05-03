from __future__ import annotations

from typing import Any


def fusion_score_comparison(
    candidates_before: list[dict[str, Any]],
    candidates_after: list[dict[str, Any]],
    top_k: int = 5,
) -> dict[str, Any]:
    """对比融合策略前后的排序变化。

    Args:
        candidates_before: 融合前的候选列表（每项需有 content, source, score）
        candidates_after: 融合后的候选列表
        top_k: 取前 K 个结果对比

    Returns:
        包含排序变化统计的字典
    """
    before_top = [(c["content"], c.get("source", ""), c.get("score", 0)) for c in candidates_before[:top_k]]
    after_top = [(c["content"], c.get("source", ""), c.get("score", 0)) for c in candidates_after[:top_k]]

    # 计算排序变化
    before_contents = {c[0]: i for i, c in enumerate(before_top)}
    rank_changes = []
    for i, (content, source, _score) in enumerate(after_top):
        old_rank = before_contents.get(content, -1)
        if old_rank >= 0:
            rank_changes.append({
                "content": content[:50],
                "source": source,
                "old_rank": old_rank + 1,
                "new_rank": i + 1,
                "rank_change": old_rank - i,  # 正数表示排名提升
            })

    # 来源分布变化
    before_sources = {}
    for _, source, _ in before_top:
        before_sources[source] = before_sources.get(source, 0) + 1

    after_sources = {}
    for _, source, _ in after_top:
        after_sources[source] = after_sources.get(source, 0) + 1

    # 是否有新内容进入 top-K
    before_set = {c[0] for c in before_top}
    after_set = {c[0] for c in after_top}
    new_entries = len(after_set - before_set)
    dropped = len(before_set - after_set)

    return {
        "top_k": top_k,
        "rank_changes": rank_changes,
        "before_source_distribution": before_sources,
        "after_source_distribution": after_sources,
        "new_entries_count": new_entries,
        "dropped_count": dropped,
        "improvement_rate": sum(1 for r in rank_changes if r["rank_change"] > 0) / max(len(rank_changes), 1),
    }
