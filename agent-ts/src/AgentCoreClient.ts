import { spawn } from "node:child_process";
import { AgentCoreExecutableLocator } from "./AgentCoreExecutableLocator.js";
import type { JsonObject } from "./JsonTypes.js";
import type { ProtocolEvent } from "./ProtocolEvent.js";

export class AgentCoreClient {
  private readonly executablePath: string | undefined;

  constructor(explicitPath?: string) {
    this.executablePath = explicitPath || new AgentCoreExecutableLocator().findDefaultExecutable();
  }

  async serializeEvent(event: ProtocolEvent): Promise<string> {
    if (!this.executablePath) {
      return this.serializeEventInTs(event);
    }

    try {
      return await this.runCore("sse-event", JSON.stringify(event));
    } catch {
      return this.serializeEventInTs(event);
    }
  }

  async health(): Promise<JsonObject> {
    if (!this.executablePath) {
      return { status: "ok", core: "typescript-fallback" };
    }

    try {
      const output = await this.runCore("health", "");
      return JSON.parse(output) as JsonObject;
    } catch {
      return { status: "degraded", core: "typescript-fallback" };
    }
  }

  private runCore(command: string, input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.executablePath) {
        reject(new Error("agent-core executable not found"));
        return;
      }

      const child = spawn(this.executablePath, [command], {
        stdio: ["pipe", "pipe", "pipe"]
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve(Buffer.concat(stdout).toString("utf8"));
          return;
        }
        reject(new Error(Buffer.concat(stderr).toString("utf8") || `agent-core exited with ${code}`));
      });

      child.stdin.end(input);
    });
  }

  private serializeEventInTs(event: ProtocolEvent): string {
    const envelope = {
      event_version: "1.0",
      trace_id: event.traceId || "",
      timestamp: Date.now(),
      source: event.source || "system",
      payload: event.payload
    };
    return `event: ${event.event}\ndata: ${JSON.stringify(envelope)}\n\n`;
  }
}
