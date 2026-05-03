from __future__ import annotations

from typing import Any


def annotation_accuracy(
    predicted: dict[str, Any],
    expected: dict[str, Any],
) -> dict[str, bool]:
    """计算标注字段级准确率。

    Args:
        predicted: 预测的标注结果
        expected: 期望的标注结果

    Returns:
        各字段是否正确的字典
    """
    results = {}
    for field_name in ("type", "authority", "effective_date"):
        if field_name in expected:
            pred_val = predicted.get(field_name, "")
            exp_val = expected[field_name]
            # effective_date 只比较年月日部分
            if field_name == "effective_date" and pred_val:
                pred_val = pred_val[:10]
                exp_val = exp_val[:10] if exp_val else ""
            results[f"{field_name}_correct"] = pred_val == exp_val
    return results


def annotation_f1(
    predicted_type: str,
    expected_type: str,
    labels: list[str] | None = None,
) -> dict[str, float]:
    """计算标注类型的 F1 分数。

    简化版本：将问题视为二分类（是否正确标注为期望类型）。

    Args:
        predicted_type: 预测的类型
        expected_type: 期望的类型
        labels: 所有可能的标签（默认 ["policy", "product", "general"]）

    Returns:
        包含 precision, recall, f1 的字典
    """
    if labels is None:
        labels = ["policy", "product", "general"]

    # 简化为二分类：是否正确
    if predicted_type == expected_type:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0}
    else:
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0}
