from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass
class EvalReport:
    """评估报告。"""

    meta: dict[str, Any] = field(default_factory=dict)
    summary: dict[str, Any] = field(default_factory=dict)
    cases: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def create(
        cls,
        dataset_name: str,
        config: dict[str, Any] | None = None,
    ) -> EvalReport:
        """创建新的评估报告。"""
        return cls(
            meta={
                "timestamp": datetime.now().isoformat(),
                "dataset": dataset_name,
                "config": config or {},
            },
            summary={},
            cases=[],
        )

    def add_case_result(self, case_result: dict[str, Any]) -> None:
        """添加单个 case 的评估结果。"""
        self.cases.append(case_result)

    def compute_summary(self) -> None:
        """汇总所有 case 的结果，计算平均指标。"""
        if not self.cases:
            return

        # 检索指标汇总
        retrieval_metrics = {"recall@5": [], "mrr": [], "ndcg@5": []}
        for case in self.cases:
            ret = case.get("retrieval", {})
            for key in retrieval_metrics:
                if key in ret:
                    retrieval_metrics[key].append(ret[key])

        self.summary["retrieval"] = {
            k: round(sum(v) / len(v), 4) if v else 0.0
            for k, v in retrieval_metrics.items()
        }

        # 标注指标汇总
        annotation_metrics = {"type_correct": [], "authority_correct": [], "effective_date_correct": []}
        for case in self.cases:
            ann = case.get("annotation", {})
            for key in annotation_metrics:
                if key in ann:
                    annotation_metrics[key].append(1.0 if ann[key] else 0.0)

        self.summary["annotation"] = {
            k: round(sum(v) / len(v), 4) if v else 0.0
            for k, v in annotation_metrics.items()
        }

        # 融合指标汇总
        fusion_scores = []
        for case in self.cases:
            fus = case.get("fusion", {})
            if "improvement_rate" in fus:
                fusion_scores.append(fus["improvement_rate"])
        self.summary["fusion"] = {
            "improvement_rate": round(sum(fusion_scores) / len(fusion_scores), 4) if fusion_scores else 0.0,
        }

        # 端到端指标汇总
        e2e_scores = []
        e2e_dims = {"relevance": [], "completeness": [], "accuracy": [], "fluency": []}
        for case in self.cases:
            e2e = case.get("e2e", {})
            if "avg_score" in e2e and e2e.get("avg_score", 0) > 0:
                e2e_scores.append(e2e["avg_score"])
                for dim in e2e_dims:
                    if dim in e2e:
                        e2e_dims[dim].append(e2e[dim])

        self.summary["e2e"] = {
            "avg_score": round(sum(e2e_scores) / len(e2e_scores), 2) if e2e_scores else 0.0,
            **{dim: round(sum(v) / len(v), 2) if v else 0.0 for dim, v in e2e_dims.items()},
        }


def save_json(report: EvalReport, path: str | Path) -> None:
    """将评估报告保存为 JSON 文件。"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(asdict(report), f, ensure_ascii=False, indent=2)
