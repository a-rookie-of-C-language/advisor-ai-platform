import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ChatMessageDTO } from "../../../common/model/ChatMessageDTO.js";

export class ContextTranscriptStore {
  constructor(private readonly baseDir: string) {}

  save(sessionId: number | null, messages: readonly ChatMessageDTO[]): string {
    const now = new Date();
    const timestamp = [
      now.getUTCFullYear().toString().padStart(4, "0"),
      (now.getUTCMonth() + 1).toString().padStart(2, "0"),
      now.getUTCDate().toString().padStart(2, "0")
    ].join("")
      + "_"
      + [
        now.getUTCHours().toString().padStart(2, "0"),
        now.getUTCMinutes().toString().padStart(2, "0"),
        now.getUTCSeconds().toString().padStart(2, "0")
      ].join("");
    const sessionPart = sessionId == null ? "unknown" : String(sessionId);
    const filePath = resolve(this.baseDir, `session_${sessionPart}_${timestamp}.jsonl`);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      messages
        .map((message) => JSON.stringify({ role: message.role, content: message.content }, undefined, 0))
        .join("\n") + "\n",
      { encoding: "utf8" }
    );
    return filePath;
  }
}
