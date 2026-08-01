import type { ServerResponse } from "node:http";
import { WorkspaceError } from "../workspace/WorkspaceError.js";

export class AgentJsonResponseWriter {
  write(response: ServerResponse, statusCode: number, body: unknown): void {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
  }

  writeError(response: ServerResponse, error: unknown): void {
    this.write(response, this.statusCodeForError(error), {
      detail: error instanceof Error ? error.message : "internal error"
    });
  }

  private statusCodeForError(error: unknown): number {
    return error instanceof WorkspaceError ? 400 : 500;
  }
}
