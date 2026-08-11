from __future__ import annotations

from json_types import JsonObject
from safety.safety_pipeline import SafetyPipeline


def filter_tool_result(tool_name: str, payload: JsonObject, pipeline: SafetyPipeline | None) -> tuple[JsonObject, int]:
    _ = tool_name
    if pipeline is None:
        return payload, 0

    sensitive_count = 0
    result = dict(payload)

    if "message" in result and isinstance(result["message"], str):
        safety_result = pipeline.filter_text(result["message"])
        if safety_result.has_sensitive:
            result["message"] = safety_result.redacted
            sensitive_count += len(safety_result.regex_matches)
            if safety_result.privacy_result:
                sensitive_count += len(safety_result.privacy_result.spans)

    if "items" in result and isinstance(result["items"], list):
        filtered_items = []
        for item in result["items"]:
            if isinstance(item, dict) and item.get("type") == "text":
                text = item.get("text", "")
                if isinstance(text, str):
                    safety_result = pipeline.filter_text(text)
                    if safety_result.has_sensitive:
                        filtered_items.append({"type": "text", "text": safety_result.redacted})
                        sensitive_count += len(safety_result.regex_matches)
                        if safety_result.privacy_result:
                            sensitive_count += len(safety_result.privacy_result.spans)
                    else:
                        filtered_items.append(item)
                else:
                    filtered_items.append(item)
            else:
                filtered_items.append(item)
        result["items"] = filtered_items

    return result, sensitive_count


def derive_tool_result(tool_name: str, payload: JsonObject) -> JsonObject:
    if tool_name not in {"rag_search", "web_search"}:
        return {}
    items = payload.get("items", [])
    if not isinstance(items, list) or not items:
        return {}
    sources = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        doc_name = item.get("docName") or item.get("title") or ""
        snippet = item.get("snippet") or item.get("content") or ""
        sources.append(
            {
                "id": item.get("id") or index + 1,
                "docName": doc_name,
                "snippet": snippet,
                "score": item.get("score"),
            }
        )
    return {"sources": sources} if sources else {}


def build_tool_result_payload(
    tool_name: str,
    base_payload: JsonObject,
    payload: JsonObject,
) -> JsonObject:
    result_payload = {
        **base_payload,
        "output": payload,
        "items": payload.get("items", []),
    }
    derived = derive_tool_result(tool_name, payload)
    if derived:
        result_payload["derived"] = derived
    return result_payload
