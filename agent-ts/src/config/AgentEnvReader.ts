import { BooleanStringReader } from "../common/BooleanStringReader.js";
import { OpenAiTimeoutEnvReader } from "./OpenAiTimeoutEnvReader.js";

export class AgentEnvReader {
  private readonly openAiTimeoutEnvReader = new OpenAiTimeoutEnvReader();

  readString(name: string, fallback: string): string {
    return process.env[name]?.trim() || fallback;
  }

  readOptionalString(name: string): string | undefined {
    return process.env[name]?.trim() || undefined;
  }

  readInt(name: string, fallback: number): number {
    return Number.parseInt(process.env[name] || String(fallback), 10);
  }

  readFloat(name: string, fallback: number): number {
    return Number.parseFloat(process.env[name] || String(fallback));
  }

  readTrimmedUrl(name: string, fallback: string): string {
    return this.readString(name, fallback).replace(/\/+$/, "");
  }

  readBool(name: string, defaultValue: boolean): boolean {
    const raw = process.env[name]?.trim().toLowerCase();
    if (!raw) {
      return defaultValue;
    }
    return BooleanStringReader.readTruthy(raw, ["1", "true", "yes", "on"]);
  }

  readOpenAiTimeoutMs(): number {
    return this.openAiTimeoutEnvReader.read();
  }
}
