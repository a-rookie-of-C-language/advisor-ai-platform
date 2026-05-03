from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ActionScore:
    total: int
    should_call_tool: bool
    called_tool: bool
    tool_choice_ok: bool
    args_ok: bool
    grounded_ok: bool
    success: bool
    reasons: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "total": self.total,
            "should_call_tool": self.should_call_tool,
            "called_tool": self.called_tool,
            "tool_choice_ok": self.tool_choice_ok,
            "args_ok": self.args_ok,
            "grounded_ok": self.grounded_ok,
            "success": self.success,
            "reasons": list(self.reasons),
        }


def score_action(
    *,
    user_query: str,
    kb_id: int | None,
    trace_events: list[dict[str, Any]],
) -> ActionScore:
    lower_query = user_query.lower()
    should_call = bool(user_query.strip()) and kb_id is not None and kb_id > 0 and any(
        key in lower_query
        for key in ["根据", "资料", "知识库", "出处", "政策", "文档", "哪条", "来源", "where", "source"]
    )

    source_events = [e for e in trace_events if e.get("event") == "sources"]
    called_tool = bool(source_events)
    tool_choice_ok = all((e.get("data") or {}).get("tool") for e in source_events) if called_tool else not should_call
    args_ok = all((e.get("data") or {}).get("status") != "error" for e in source_events) if called_tool else True
    grounded_ok = True
    if called_tool:
        grounded_ok = all(
            (e.get("data") or {}).get("status") in {"hit", "miss"}
            and isinstance((e.get("data") or {}).get("items"), list)
            for e in source_events
        )
    has_error = any(e.get("event") == "error" for e in trace_events)
    success = not has_error

    score = 100
    reasons: list[str] = []
    if should_call and not called_tool:
        score -= 30
        reasons.append("should_call_but_not_called")
    if called_tool and not tool_choice_ok:
        score -= 20
        reasons.append("tool_choice_invalid")
    if called_tool and not args_ok:
        score -= 20
        reasons.append("tool_args_or_execution_invalid")
    if called_tool and not grounded_ok:
        score -= 20
        reasons.append("tool_result_not_grounded")
    if has_error:
        score -= 20
        reasons.append("stream_error")

    score = max(0, min(100, score))
    return ActionScore(
        total=score,
        should_call_tool=should_call,
        called_tool=called_tool,
        tool_choice_ok=tool_choice_ok,
        args_ok=args_ok,
        grounded_ok=grounded_ok,
        success=success,
        reasons=reasons,
    )
