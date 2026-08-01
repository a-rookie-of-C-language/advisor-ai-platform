import type { JsonObject } from "./JsonTypes.js";

export class OpenAIToolArgumentParser {
  static parse(rawArguments: string): JsonObject {
    try {
      const parsed = JSON.parse(rawArguments || "{}") as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonObject;
      }
    } catch {
      return {};
    }
    return {};
  }
}
