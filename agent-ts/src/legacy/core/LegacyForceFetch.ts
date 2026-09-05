import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../../openai/tools/runtime/model/result/OpenAiToolExecutionResult.js";
import { extractFirstUrl } from "../../graph/helpers.js";

export const LEGACY_FORCE_FETCH_TOOL_NAME = "web_fetch";
export const LEGACY_FORCE_FETCH_TOOL_CALL_ID = "web_fetch-1";
export const LEGACY_FORCE_FETCH_MAX_CONTENT_LENGTH = 4000;

export function resolveForceFetchUrl(matchedTools: readonly string[], userQuery: string): string {
  if (!matchedTools.includes(LEGACY_FORCE_FETCH_TOOL_NAME)) return "";
  return extractFirstUrl(userQuery);
}

export async function executeLegacyForceFetch(
  url: string,
  toolExecutor: (toolName: string, args: JsonObject) => Promise<OpenAiToolExecutionResult>
): Promise<{ events: JsonObject[]; contextPrompt: string }> {
  const toolInput = { url, max_content_length: LEGACY_FORCE_FETCH_MAX_CONTENT_LENGTH };
  const result = await toolExecutor(LEGACY_FORCE_FETCH_TOOL_NAME, toolInput);
  const payload = parseToolOutput(result.output);
  const basePayload = {
    tool_name: LEGACY_FORCE_FETCH_TOOL_NAME,
    tool_call_id: LEGACY_FORCE_FETCH_TOOL_CALL_ID,
    attempt: 1,
    status: String(payload.status || "error"),
    message: String(payload.message || "tool execute failed")
  };
  const resultEvent = payload.ok
    ? { event: "tool_result", payload: { ...basePayload, ...payload } }
    : { event: "tool_error", payload: { ...basePayload, code: basePayload.status, retryable: false } };
  return {
    events: [
      buildLegacyForceFetchUseEvent(url),
      resultEvent,
      {
        event: "sys_done",
        payload: {
          finish_reason: "stream_finished"
        }
      }
    ],
    contextPrompt: buildForceFetchContextPrompt(payload)
  };
}

export function buildLegacyForceFetchUseEvent(url: string): JsonObject {
  return {
    event: "tool_use",
    payload: {
      tool_name: LEGACY_FORCE_FETCH_TOOL_NAME,
      tool_call_id: LEGACY_FORCE_FETCH_TOOL_CALL_ID,
      input: { url, max_content_length: LEGACY_FORCE_FETCH_MAX_CONTENT_LENGTH }
    }
  };
}

export function buildForceFetchContextPrompt(payload: JsonObject): string {
  const fetchedItems = payload.items;
  if (!Array.isArray(fetchedItems) || fetchedItems.length === 0) return "";
  const first = typeof fetchedItems[0] === "object" && fetchedItems[0] !== null ? (fetchedItems[0] as JsonObject) : {};
  const content = String(first.content || "").trim();
  if (!content) return "";
  return `请严格基于以下网页原文回答，并明确标注不确定处：\n${content.slice(0, LEGACY_FORCE_FETCH_MAX_CONTENT_LENGTH)}`;
}

function parseToolOutput(rawOutput: string): JsonObject {
  try {
    return rawOutput ? (JSON.parse(rawOutput) as JsonObject) : {};
  } catch {
    return {};
  }
}
