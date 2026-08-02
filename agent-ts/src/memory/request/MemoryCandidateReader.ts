import type { JsonObject } from "../../common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../../openai/tools/arguments/OpenAiToolArgumentReader.js";
import type { MemoryCandidateInput } from "../model/MemoryCandidateInput.js";

export class MemoryCandidateReader {
  readCandidates(args: JsonObject): MemoryCandidateInput[] {
    const value = OpenAiToolArgumentReader.readAliasedValue(args, "candidates");
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("memory_write candidates empty");
    }
    return value
      .map((item) => (item && typeof item === "object" && !Array.isArray(item) ? (item as JsonObject) : {}))
      .map((item) => ({
        content: OpenAiToolArgumentReader.readRequiredString(item, "content"),
        confidence: OpenAiToolArgumentReader.readOptionalNumber(item, "confidence", 0.5),
        sourceTurnId: OpenAiToolArgumentReader.readOptionalString(item, "source_turn_id", null),
        tags: OpenAiToolArgumentReader.readOptionalJsonObject(item, "tags"),
        memoryType: OpenAiToolArgumentReader.readOptionalString(item, "memory_type", null),
        isCore: OpenAiToolArgumentReader.readOptionalBoolean(item, "is_core", null)
      }));
  }
}
