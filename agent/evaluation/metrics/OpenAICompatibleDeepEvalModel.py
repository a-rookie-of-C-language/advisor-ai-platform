from __future__ import annotations

import os

from deepeval.models import DeepEvalBaseLLM
from openai import AsyncOpenAI, OpenAI


class OpenAICompatibleDeepEvalModel(DeepEvalBaseLLM):
    def __init__(self, model_name: str, api_key: str, base_url: str | None = None) -> None:
        self._api_key = api_key
        self._base_url = base_url
        super().__init__(model_name=model_name)

    def load_model(self, *args, **kwargs):  # noqa: ANN002, ANN003
        _ = args
        _ = kwargs
        return OpenAI(api_key=self._api_key, base_url=self._base_url)

    def generate(self, prompt: str, schema=None):  # noqa: ANN001
        client = self.load_model()
        completion = client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
        )
        content = completion.choices[0].message.content or ""
        if schema is not None:
            return schema.model_validate_json(content)
        return content

    async def a_generate(self, prompt: str, schema=None):  # noqa: ANN001
        client = AsyncOpenAI(api_key=self._api_key, base_url=self._base_url)
        completion = await client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
        )
        content = completion.choices[0].message.content or ""
        if schema is not None:
            return schema.model_validate_json(content)
        return content

    def generate_raw_response(self, prompt: str, top_logprobs: int = 5):  # noqa: ARG002
        _ = top_logprobs
        client = self.load_model()
        completion = client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
        )
        return completion, 0.0

    async def a_generate_raw_response(self, prompt: str, top_logprobs: int = 5):  # noqa: ARG002
        _ = top_logprobs
        client = AsyncOpenAI(api_key=self._api_key, base_url=self._base_url)
        completion = await client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
        )
        return completion, 0.0

    def get_model_name(self, *args, **kwargs) -> str:  # noqa: ANN002, ANN003
        _ = args
        _ = kwargs
        return self.model_name


def build_deepeval_model(model_name: str | None = None) -> OpenAICompatibleDeepEvalModel:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Missing OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL", "").strip() or None
    return OpenAICompatibleDeepEvalModel(
        model_name=model_name or "gpt-5.5",
        api_key=api_key,
        base_url=base_url,
    )
