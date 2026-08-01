import { BooleanStringReader } from "../common/BooleanStringReader.js";

export class AgentEnvReader {
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
    const timeoutMs = process.env.OPENAI_TIMEOUT_MS?.trim();
    if (timeoutMs) {
      return Number.parseInt(timeoutMs, 10);
    }
    const timeoutSec = process.env.OPENAI_TIMEOUT_SEC?.trim();
    if (timeoutSec) {
      return Math.round(Number.parseFloat(timeoutSec) * 1000);
    }
    return 600_000;
  }
}
