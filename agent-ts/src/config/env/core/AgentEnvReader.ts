import { AgentBooleanEnvReader } from "../readers/AgentBooleanEnvReader.js";
import { OpenAiTimeoutEnvReader } from "../readers/OpenAiTimeoutEnvReader.js";

export class AgentEnvReader {
  private readonly booleanEnvReader = new AgentBooleanEnvReader();
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
    return this.booleanEnvReader.read(name, defaultValue);
  }

  readOpenAiTimeoutMs(): number {
    return this.openAiTimeoutEnvReader.read();
  }
}
