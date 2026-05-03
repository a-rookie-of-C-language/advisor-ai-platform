from __future__ import annotations

from evaluation.dataset import EvalCase, EvalDataset
from evaluation.metrics.annotation import annotation_accuracy, annotation_f1
from evaluation.metrics.retrieval import retrieval_mrr, retrieval_ndcg, retrieval_recall_at_k
from evaluation.report import EvalReport


class TestRetrievalMetrics:
    def test_recall_at_k_perfect(self) -> None:
        retrieved = ["c1", "c2", "c3", "c4", "c5"]
        expected = ["c1", "c2", "c3"]
        assert retrieval_recall_at_k(retrieved, expected, k=5) == 1.0

    def test_recall_at_k_partial(self) -> None:
        retrieved = ["c1", "c2", "c3", "c4", "c5"]
        expected = ["c1", "c2", "c6"]
        assert retrieval_recall_at_k(retrieved, expected, k=5) == 2 / 3

    def test_recall_at_k_zero(self) -> None:
        retrieved = ["c1", "c2", "c3"]
        expected = ["c4", "c5"]
        assert retrieval_recall_at_k(retrieved, expected, k=5) == 0.0

    def test_recall_at_k_empty_expected(self) -> None:
        assert retrieval_recall_at_k(["c1"], [], k=5) == 0.0

    def test_mrr_first_position(self) -> None:
        retrieved = ["c1", "c2", "c3"]
        expected = ["c1"]
        assert retrieval_mrr(retrieved, expected) == 1.0

    def test_mrr_second_position(self) -> None:
        retrieved = ["c1", "c2", "c3"]
        expected = ["c2"]
        assert retrieval_mrr(retrieved, expected) == 0.5

    def test_mrr_not_found(self) -> None:
        retrieved = ["c1", "c2", "c3"]
        expected = ["c4"]
        assert retrieval_mrr(retrieved, expected) == 0.0

    def test_mrr_empty_expected(self) -> None:
        assert retrieval_mrr(["c1"], []) == 0.0

    def test_ndcg_perfect(self) -> None:
        retrieved = ["c1", "c2", "c3"]
        expected = ["c1", "c2", "c3"]
        assert retrieval_ndcg(retrieved, expected, k=3) == 1.0

    def test_ndcg_imperfect(self) -> None:
        retrieved = ["c2", "c3", "c1"]
        expected = ["c1", "c2"]
        ndcg = retrieval_ndcg(retrieved, expected, k=3)
        assert 0.0 < ndcg < 1.0

    def test_ndcg_empty_expected(self) -> None:
        assert retrieval_ndcg(["c1"], [], k=5) == 0.0


class TestAnnotationMetrics:
    def test_accuracy_all_correct(self) -> None:
        predicted = {"type": "policy", "authority": "official", "effective_date": "2024-01-01"}
        expected = {"type": "policy", "authority": "official", "effective_date": "2024-01-01"}
        result = annotation_accuracy(predicted, expected)
        assert result == {"type_correct": True, "authority_correct": True, "effective_date_correct": True}

    def test_accuracy_partial_correct(self) -> None:
        predicted = {"type": "policy", "authority": "secondary"}
        expected = {"type": "policy", "authority": "official"}
        result = annotation_accuracy(predicted, expected)
        assert result["type_correct"] is True
        assert result["authority_correct"] is False

    def test_f1_correct(self) -> None:
        assert annotation_f1("policy", "policy") == {"precision": 1.0, "recall": 1.0, "f1": 1.0}

    def test_f1_incorrect(self) -> None:
        assert annotation_f1("policy", "product") == {"precision": 0.0, "recall": 0.0, "f1": 0.0}


class TestEvalDataset:
    def test_load_from_dict(self) -> None:
        cases = [
            EvalCase(id="c1", query="test query", expected_chunks=["chunk1"]),
        ]
        dataset = EvalDataset(name="test", version="1.0", kb_id=1, cases=cases)
        assert len(dataset.cases) == 1
        assert dataset.cases[0].id == "c1"


class TestEvalReport:
    def test_create_report(self) -> None:
        report = EvalReport.create(dataset_name="test")
        assert report.meta["dataset"] == "test"
        assert report.summary == {}

    def test_compute_summary(self) -> None:
        report = EvalReport.create(dataset_name="test")
        report.add_case_result({
            "id": "c1",
            "retrieval": {"recall@5": 1.0, "mrr": 1.0, "ndcg@5": 1.0},
            "annotation": {"type_correct": True, "authority_correct": False},
            "fusion": {"improvement_rate": 0.5},
            "e2e": {"avg_score": 4.5, "relevance": 5.0, "completeness": 4.0, "accuracy": 4.5, "fluency": 4.5},
        })
        report.add_case_result({
            "id": "c2",
            "retrieval": {"recall@5": 0.5, "mrr": 0.5, "ndcg@5": 0.5},
            "annotation": {"type_correct": False, "authority_correct": True},
            "fusion": {"improvement_rate": 0.0},
            "e2e": {"avg_score": 3.0, "relevance": 3.0, "completeness": 3.0, "accuracy": 3.0, "fluency": 3.0},
        })
        report.compute_summary()

        assert report.summary["retrieval"]["recall@5"] == 0.75
        assert report.summary["retrieval"]["mrr"] == 0.75
        assert report.summary["annotation"]["type_correct"] == 0.5
        assert report.summary["e2e"]["avg_score"] == 3.75
