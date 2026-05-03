from __future__ import annotations

from skills.skill import Skill
from skills.skill_registry import SkillRegistry

KNOWLEDGE_QA = Skill(
    name="knowledge_qa",
    description="基于知识库回答问题，优先从已上传的文档中检索答案。",
    brief="优先用 rag_search 从知识库检索，基于结果回答；无结果时如实告知。",
    system_prompt=(
        "你是一个知识库问答助手。请优先使用 rag_search 工具从知识库中检索相关信息，"
        "然后基于检索结果回答用户的问题。如果知识库中没有相关内容，请如实告知。"
        "回答时请引用检索到的具体内容，确保信息可追溯。"
        "如果检索结果与用户问题相关度不高，请说明匹配程度并给出你的判断依据。"
    ),
    required_tools={"rag_search"},
    priority=10,
)

WEB_RESEARCH = Skill(
    name="web_research",
    description="联网搜索获取实时信息，适合查询最新资讯、事实核查等。",
    brief="用 web_search 搜索互联网，整理结果并注明来源。",
    system_prompt=(
        "你是一个联网研究助手。请使用 web_search 工具搜索互联网获取最新信息，"
        "然后对搜索结果进行整理和总结，给出有依据的回答。请注明信息来源。"
        "优先使用权威来源，对比多个结果交叉验证。"
        "如果搜索结果存在矛盾，请指出分歧并给出你的分析。"
    ),
    required_tools={"web_search"},
    priority=8,
)

MEMORY_MANAGE = Skill(
    name="memory_manage",
    description="管理用户的长期记忆，包括查看、搜索和写入记忆。",
    brief="用 memory_read 搜索记忆，用 memory_write 保存新记忆。",
    system_prompt=(
        "你是一个记忆管理助手。你可以使用 memory_read 工具搜索用户的长期记忆，"
        "使用 memory_write 工具保存新的记忆。请帮助用户整理和管理他们的记忆信息。"
        "写入前请先搜索确认是否已有相关记忆，避免重复。"
        "保存时提炼关键信息，保持简洁准确。"
    ),
    required_tools={"memory_read", "memory_write"},
    priority=5,
)


def build_default_registry() -> SkillRegistry:
    """Create a SkillRegistry with all preset skills registered."""
    registry = SkillRegistry()
    registry.register(KNOWLEDGE_QA)
    registry.register(WEB_RESEARCH)
    registry.register(MEMORY_MANAGE)
    return registry
