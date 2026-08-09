from __future__ import annotations

from agents.search import WebFetchSubAgent, WebSearchSubAgent
from agents.task_planner.TaskPlannerSubAgent import TaskPlannerSubAgent
from agents.tool_explorer import ToolExplorerSubAgent
from chat.subagent_provider_factory import SubagentProviderFactory
from context.compaction.ContextCompactionSubAgent import ContextCompactionSubAgent
from llm.base_provider import BaseLLMProvider


def build_subagent_provider(
    factory: SubagentProviderFactory,
    *,
    env_prefix: str,
    default_model: str | None = None,
    temperature_default: float = 0.0,
    timeout_default: float = 30.0,
    max_retries_default: int = 0,
    stream_timeout_default: float = 30.0,
    tool_round_timeout_default: float = 20.0,
    stream_idle_timeout_default: float = 45.0,
) -> BaseLLMProvider:
    return factory.build(
        env_prefix=env_prefix,
        default_model=default_model,
        temperature_default=temperature_default,
        timeout_default=timeout_default,
        max_retries_default=max_retries_default,
        stream_timeout_default=stream_timeout_default,
        tool_round_timeout_default=tool_round_timeout_default,
        stream_idle_timeout_default=stream_idle_timeout_default,
    )


def build_tool_explorer_provider(factory: SubagentProviderFactory) -> BaseLLMProvider:
    return build_subagent_provider(
        factory,
        env_prefix=ToolExplorerSubAgent.MODEL_ENV_PREFIX,
        default_model=ToolExplorerSubAgent.DEFAULT_MODEL,
    )


def build_context_compaction_provider(factory: SubagentProviderFactory) -> BaseLLMProvider:
    return build_subagent_provider(
        factory,
        env_prefix=ContextCompactionSubAgent.MODEL_ENV_PREFIX,
        default_model=ContextCompactionSubAgent.DEFAULT_MODEL,
    )


def build_task_planner_provider(factory: SubagentProviderFactory) -> BaseLLMProvider:
    return build_subagent_provider(
        factory,
        env_prefix=TaskPlannerSubAgent.MODEL_ENV_PREFIX,
        default_model=TaskPlannerSubAgent.DEFAULT_MODEL,
    )


def build_web_search_provider(factory: SubagentProviderFactory) -> BaseLLMProvider:
    return build_subagent_provider(
        factory,
        env_prefix=WebSearchSubAgent.MODEL_ENV_PREFIX,
        default_model=WebSearchSubAgent.DEFAULT_MODEL,
    )


def build_web_fetch_provider(factory: SubagentProviderFactory) -> BaseLLMProvider:
    return build_subagent_provider(
        factory,
        env_prefix=WebFetchSubAgent.MODEL_ENV_PREFIX,
        default_model=WebFetchSubAgent.DEFAULT_MODEL,
    )
