import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import { OpenAiToolArgumentReader } from "./OpenAiToolArgumentReader.js";

export class OpenAiToolTopKArgumentReader {
  static read(args: JsonObject, fallback: number): number {
    return Math.min(Math.max(OpenAiToolArgumentReader.readOptionalNumber(args, "top_k", fallback), 1), 10);
  }
}
