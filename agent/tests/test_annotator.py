from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from RAG.annotator.annotation_pipeline import AnnotationPipeline
from RAG.annotator.base_annotator import ChunkAnnotation
from RAG.annotator.rule_annotator import RuleAnnotator


class TestChunkAnnotation:
    def test_default_values(self) -> None:
        ann = ChunkAnnotation()
        assert ann.type == "general"
        assert ann.authority == "secondary"
        assert ann.effective_date == ""
        assert ann.confidence == 0.0
        assert ann.source == ""
        assert ann.extra == {}

    def test_custom_values(self) -> None:
        ann = ChunkAnnotation(
            type="policy",
            authority="official",
            effective_date="2024-01-01",
            confidence=0.9,
            source="rule",
        )
        assert ann.type == "policy"
        assert ann.authority == "official"
        assert ann.effective_date == "2024-01-01"
        assert ann.confidence == 0.9
        assert ann.source == "rule"


class TestRuleAnnotator:
    def test_extracts_doc_number(self) -> None:
        annotator = RuleAnnotator()
        text = "教育部〔2024〕15号文件规定"
        ann = annotator.annotate(text)
        assert ann.extra["doc_number"] == "教育部〔2024〕15号"
        assert ann.extra["doc_org"] == "教育部"
        assert ann.effective_date == "2024-01-01"
        assert ann.confidence >= 0.3

    def test_extracts_date_chinese_format(self) -> None:
        annotator = RuleAnnotator()
        text = "本办法自2024年6月1日起施行"
        ann = annotator.annotate(text)
        assert ann.effective_date == "2024-06-01"
        assert ann.confidence >= 0.2

    def test_extracts_date_iso_format(self) -> None:
        annotator = RuleAnnotator()
        text = "发布日期：2024-06-01"
        ann = annotator.annotate(text)
        assert ann.effective_date == "2024-06-01"

    def test_detects_policy_type(self) -> None:
        annotator = RuleAnnotator()
        text = "关于印发《学生管理规定》的通知"
        ann = annotator.annotate(text)
        assert ann.type == "policy"

    def test_detects_product_type(self) -> None:
        annotator = RuleAnnotator()
        text = "系统操作指南：如何使用本平台功能"
        ann = annotator.annotate(text)
        assert ann.type == "product"

    def test_detects_official_authority(self) -> None:
        annotator = RuleAnnotator()
        text = "教育部办公厅关于加强学生管理的通知"
        ann = annotator.annotate(text)
        assert ann.authority == "official"

    def test_merges_with_existing_annotation(self) -> None:
        annotator = RuleAnnotator()
        existing = ChunkAnnotation(type="policy", confidence=0.5)
        text = "教育部〔2024〕10号"
        ann = annotator.annotate(text, existing=existing)
        assert ann.type == "policy"
        assert ann.extra["doc_number"] == "教育部〔2024〕10号"
        assert ann.confidence > 0.5

    def test_name(self) -> None:
        annotator = RuleAnnotator()
        assert annotator.name == "rule_v1"

    def test_empty_text_low_confidence(self) -> None:
        annotator = RuleAnnotator()
        ann = annotator.annotate("普通文本，没有特征")
        assert ann.source == "rule"
        assert ann.confidence < 0.5


class TestAnnotationPipeline:
    def test_empty_text_returns_zero_confidence(self) -> None:
        pipeline = AnnotationPipeline(annotators=[])
        ann = pipeline.annotate_chunk("")
        assert ann.confidence == 0.0
        assert ann.source == "empty"

    def test_whitespace_only_returns_zero_confidence(self) -> None:
        pipeline = AnnotationPipeline(annotators=[])
        ann = pipeline.annotate_chunk("   \n\t  ")
        assert ann.confidence == 0.0
        assert ann.source == "empty"

    def test_skips_hanlp_when_rule_high_confidence(self) -> None:
        rule = RuleAnnotator()
        hanlp_mock = MagicMock()
        hanlp_mock.name = "hanlp"
        hanlp_mock.annotate = MagicMock(return_value=ChunkAnnotation(source="hanlp"))

        pipeline = AnnotationPipeline(
            annotators=[rule, hanlp_mock],
            rule_threshold=0.5,
        )
        text = "教育部〔2024〕15号文件，2024年6月1日发布"
        pipeline.annotate_chunk(text)
        hanlp_mock.annotate.assert_not_called()

    def test_calls_llm_when_hanlp_low_confidence(self) -> None:
        rule = RuleAnnotator()
        hanlp_mock = MagicMock()
        hanlp_mock.name = "hanlp"
        hanlp_mock.annotate = MagicMock(
            return_value=ChunkAnnotation(source="hanlp", confidence=0.3)
        )
        llm_mock = MagicMock()
        llm_mock.name = "llm"
        llm_mock.annotate = MagicMock(
            return_value=ChunkAnnotation(source="llm", confidence=0.8)
        )

        pipeline = AnnotationPipeline(
            annotators=[rule, hanlp_mock, llm_mock],
            rule_threshold=0.9,
            hanlp_threshold=0.6,
        )
        text = "普通文本"
        ann = pipeline.annotate_chunk(text)
        llm_mock.annotate.assert_called_once()
        assert ann.source == "llm"

    def test_skips_llm_when_hanlp_high_confidence(self) -> None:
        rule = RuleAnnotator()
        hanlp_mock = MagicMock()
        hanlp_mock.name = "hanlp"
        hanlp_mock.annotate = MagicMock(
            return_value=ChunkAnnotation(source="hanlp", confidence=0.7)
        )
        llm_mock = MagicMock()
        llm_mock.name = "llm"

        pipeline = AnnotationPipeline(
            annotators=[rule, hanlp_mock, llm_mock],
            rule_threshold=0.9,
            hanlp_threshold=0.6,
        )
        text = "普通文本"
        pipeline.annotate_chunk(text)
        llm_mock.annotate.assert_not_called()

    def test_annotator_exception_skipped(self) -> None:
        failing = MagicMock()
        failing.name = "failing"
        failing.annotate = MagicMock(side_effect=RuntimeError("boom"))
        fallback = MagicMock()
        fallback.name = "fallback"
        fallback.annotate = MagicMock(
            return_value=ChunkAnnotation(source="fallback", confidence=0.5)
        )

        pipeline = AnnotationPipeline(annotators=[failing, fallback])
        ann = pipeline.annotate_chunk("test text")
        assert ann.source == "fallback"

    def test_all_fail_returns_none_source(self) -> None:
        failing = MagicMock()
        failing.name = "failing"
        failing.annotate = MagicMock(side_effect=RuntimeError("boom"))

        pipeline = AnnotationPipeline(annotators=[failing])
        ann = pipeline.annotate_chunk("test text")
        assert ann.source == "none"
        assert ann.confidence == 0.0


class TestLlmAnnotator:
    @patch("RAG.annotator.llm_annotator._build_annotation_provider_from_env")
    def test_uses_env_provider(self, mock_build) -> None:
        mock_provider = AsyncMock()
        mock_build.return_value = mock_provider
        from RAG.annotator.llm_annotator import LlmAnnotator

        annotator = LlmAnnotator()
        assert annotator._llm_provider is mock_provider

    @patch("RAG.annotator.llm_annotator._build_annotation_provider_from_env")
    def test_skips_when_no_provider(self, mock_build) -> None:
        mock_build.return_value = None
        from RAG.annotator.llm_annotator import LlmAnnotator

        annotator = LlmAnnotator(provider=None)
        ann = annotator.annotate("test text")
        assert ann.source == "llm_skip"

    @patch("RAG.annotator.llm_annotator._build_annotation_provider_from_env")
    def test_uses_custom_provider(self, mock_build) -> None:
        mock_build.return_value = None
        mock_provider = AsyncMock()

        async def fake_stream(*args, **kwargs):
            yield '{"type": "policy", "authority": "official", "effective_date": "2024-01-01", "confidence": 0.9}'

        mock_provider.stream_chat = fake_stream
        from RAG.annotator.llm_annotator import LlmAnnotator

        annotator = LlmAnnotator(provider=mock_provider)
        ann = annotator.annotate("教育部通知")
        assert ann.source == "llm"
        assert ann.type == "policy"
        assert ann.authority == "official"
