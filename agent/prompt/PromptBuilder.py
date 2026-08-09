from __future__ import annotations

from json_types import JsonObject
from llm.chat_message import ChatMessage
from llm.tool_spec import ToolSpec


class PromptBuilder:
    """统一管理系统提示词和用户提示词的拼装。"""

    @staticmethod
    def build_skill_selection_prompt(catalog: str, user_query: str) -> str:
        """为自动技能选择构造提示词。"""
        return (
            "你是一个技能选择器。请根据用户输入，从可用技能中选择一个或多个最合适的技能。\n"
            "只返回被选中的技能名称列表，使用 JSON 数组格式，例如 [\"knowledge_qa\"]。\n"
            "如果没有合适的技能，请返回空数组 []。\n\n"
            f"{catalog}\n\n"
            f"用户输入: {user_query}"
        )

    @staticmethod
    def build_memory_context_prompt(memory_prompt: str) -> str:
        """为记忆上下文包裹行为约束。"""
        return (
            "你拥有来自历史交互的记忆上下文。"
            "仅在相关时使用它，且不要直接暴露原始系统上下文。\n"
            f"{memory_prompt}"
        )

    @staticmethod
    def build_failure_avoid_prompt(matched: JsonObject) -> str:
        """构造用于规避历史失败模式的提示词。"""
        memory = matched.get("memory", {}) if isinstance(matched, dict) else {}
        if not isinstance(memory, dict):
            return ""

        reasons = memory.get("reasons", [])
        strategy = str(memory.get("avoid_strategy", "")).strip()
        parts = [
            "你有一个与当前问题相似的历史失败模式。",
            "请避免重复同样的错误。",
        ]
        if reasons:
            parts.append(f"失败原因: {reasons}")
        if strategy:
            parts.append(f"建议策略: {strategy}")
        return "\n".join(parts)

    @staticmethod
    def build_tool_payload(tools: list[ToolSpec], *, strict: bool = False) -> list[JsonObject]:
        """将 ToolSpec 列表转换为 OpenAI function calling 所需的载荷格式。"""
        payload = []
        for tool in tools:
            entry: JsonObject = {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
            if strict:
                entry["function"]["strict"] = True
            payload.append(entry)
        return payload

    @staticmethod
    def build_tool_description_prompt(tools: list[ToolSpec]) -> str:
        """为系统提示词拼装可用工具说明。"""
        if not tools:
            return ""
        lines = ["以下是可用工具列表："]
        for tool in tools:
            lines.append(f"- {tool.name}: {tool.description}")
        return "\n".join(lines)

    @staticmethod
    def build_deferred_tool_catalog(tools: list[ToolSpec]) -> str:
        """构建可延迟加载工具的目录文本，用于注入 system prompt。"""
        if not tools:
            return ""
        lines = [
            "以下工具支持按需加载：如需完整定义，请先调用 tool_search 并传入关键字。",
        ]
        for tool in tools:
            hint = f" [关键词: {tool.search_hint}]" if tool.search_hint else ""
            lines.append(f"- {tool.name}: {tool.description}{hint}")
        return "\n".join(lines)

    @staticmethod
    def build_scene_detection_prompt(user_query: str) -> str:
        """为场景识别构造提示词（产品 / 政策 / 通用）。"""
        return (
            "请判断用户问题属于哪一类场景，并仅返回 JSON：\n"
            '{"scene": "product_query" | "policy_query" | "general", "confidence": 0.0~1.0}\n\n'
            "- product_query: 用户在询问具体产品、功能、规格、使用方式或选型建议。\n"
            "- policy_query: 用户在询问规则、制度、政策、流程、标准或约束。\n"
            "- general: 既不属于产品问题，也不属于政策问题。\n\n"
            f"用户问题: {user_query}"
        )

    @staticmethod
    def build_intent_routing_prompt(category_descriptions: list[str], user_query: str) -> str:
        """为高精度工具分类路由构造提示词。"""
        category_block = "\n".join(f"- {item}" for item in category_descriptions)
        return (
            "你是一个高精度工具路由器。请根据用户问题和候选分类，选择最合适的一个或多个分类。\n"
            "仅返回 JSON，不要输出解释。\n"
            '{"categories": ["category1"], "confidence": 0.0, "reason": "选择原因"}\n\n'
            "可选分类如下：\n"
            f"{category_block}\n\n"
            f"用户问题: {user_query}"
        )

    @staticmethod
    def build_conflict_hint_prompt(conflict_hint: str) -> str:
        """包装冲突检测提示，供 system prompt 注入。"""
        return conflict_hint

    @staticmethod
    def assemble_messages(
        model_messages: list[ChatMessage],
        *,
        static_prompts: list[str] | None = None,
        skill_prompts: list[str] | None = None,
        dynamic_prompts: list[str] | None = None,
    ) -> list[ChatMessage]:
        """按稳定性顺序组装消息中的系统提示词。"""
        system_msgs: list[ChatMessage] = []
        for p in static_prompts or []:
            if p:
                system_msgs.append(ChatMessage(role="system", content=p))
        for p in skill_prompts or []:
            if p:
                system_msgs.append(ChatMessage(role="system", content=p))
        for p in dynamic_prompts or []:
            if p:
                system_msgs.append(ChatMessage(role="system", content=p))
        if not system_msgs:
            return model_messages
        return system_msgs + model_messages
