from __future__ import annotations

from typing import Any


class FailureMemoryMatcher:
    @staticmethod
    def match(query: str, memories: list[dict[str, Any]]) -> dict[str, Any] | None:
        q_tokens = set(FailureMemoryMatcher._tokenize(query))
        if not q_tokens:
            return None

        best = None
        best_score = 0.0
        for item in memories:
            text = str(item.get("user_query", ""))
            if query in text or text in query:
                return {"memory": item, "similarity": 0.9}
            m_tokens = set(FailureMemoryMatcher._tokenize(text))
            if not m_tokens:
                continue
            inter = len(q_tokens.intersection(m_tokens))
            union = len(q_tokens.union(m_tokens))
            score = inter / union if union else 0.0
            if score > best_score:
                best_score = score
                best = item

        if best is None or best_score < 0.35:
            return None
        return {"memory": best, "similarity": round(best_score, 4)}

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        text = text.lower().strip()
        if not text:
            return []
        tokens = [tok for tok in text.replace("，", " ").replace(",", " ").split() if tok]
        if not tokens:
            return [text]
        return tokens
