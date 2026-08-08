import { BooleanStringReader } from "../../../../../../common/value/boolean/BooleanStringReader.js";

export class OpenAiToolBooleanArgumentReader {
  static readOptional(value: unknown, fallback: boolean): boolean;

  static readOptional(value: unknown, fallback: boolean | null): boolean | null;

  static readOptional(value: unknown, fallback: boolean | null): boolean | null {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string" && value) {
      return BooleanStringReader.readTruthy(value, ["1", "true", "yes", "y"]);
    }
    return fallback;
  }
}
