from __future__ import annotations

import re

from context.memory.core.governance import MemoryGovernance
from context.memory.core.schema import SessionSummary

# 预编译正则，避免每次调用都重新编译
_RE_ZH = re.compile(r"[一-鿿]")
_RE_EN = re.compile(r"[A-Za-z0-9_]+")
_RE_PUNCT = re.compile(r"[^\w\s]")


def _count_by_iteration(text: str) -> tuple[int, int, int]:
    """纯字符迭代统计，长文本场景比正则快且稳定"""
    zh = en = punct = 0
    for ch in text:
        code = ord(ch)
        if 0x4E00 <= code <= 0x9FFF:
            zh += 1
        elif ch.isalnum() or ch == "_":
            en += 1
        elif not ch.isspace():
            punct += 1
    return zh, en, punct


class SessionMemory:
    def __init__(self, governance: MemoryGovernance | None = None) -> None:
        self._governance = governance or MemoryGovernance()

    def load_recent(self, messages: list[dict[str, str]], max_turns: int = 8) -> list[dict[str, str]]:
        if max_turns <= 0:
            return []
        max_messages = max_turns * 2
        return messages[-max_messages:]

    def estimate_tokens(self, messages: list[dict[str, str]]) -> int:
        """估算消息列表的总 Token 数

        策略：短文本用正则（启动开销小），长文本用字符迭代（避免回溯）
        """
        total = 0
        for message in messages:
            content = message.get("content", "")
            if len(content) < 500:
                # 短文本：正则路径（re 模块内部已优化）
                zh = len(_RE_ZH.findall(content))
                en = len(_RE_EN.findall(content))
                punct = len(_RE_PUNCT.findall(content))
            else:
                # 长文本：字符迭代（避免正则的 NFA 回溯开销）
                zh, en, punct = _count_by_iteration(content)
            total += zh + int(en * 1.3) + int(punct * 0.5)
        return total

    def should_summarize(self, messages: list[dict[str, str]]) -> bool:
        turn_trigger = len(messages) >= self._governance.summary_turn_threshold * 2
        token_trigger = self.estimate_tokens(messages) >= self._governance.summary_token_threshold
        return turn_trigger or token_trigger

    def build_summary_input(self, messages: list[dict[str, str]], window_size: int = 20) -> str:
        selected = messages[-window_size:]
        lines: list[str] = []
        for message in selected:
            role = message.get("role", "unknown")
            content = message.get("content", "")
            lines.append(f"{role}: {content}")
        return "\n".join(lines)

    @staticmethod
    def empty_summary(session_id: int) -> SessionSummary:
        return SessionSummary(session_id=session_id, summary="")