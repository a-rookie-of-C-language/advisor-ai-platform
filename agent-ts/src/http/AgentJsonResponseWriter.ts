import type { ServerResponse } from "node:http";
import { AgentHttpErrorMessageResolver } from "./AgentHttpErrorMessageResolver.js";
import { WorkspaceError } from "../workspace/WorkspaceError.js";

export class AgentJsonResponseWriter {
  private readonly errorMessageResolver = new AgentHttpErrorMessageResolver();

  write(response: ServerResponse, statusCode: number, body: unknown): void {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
  }

  writeError(response: ServerResponse, error: unknown): void {
    this.write(response, this.statusCodeForError(error), {
      detail: this.errorMessageResolver.resolve(error)
    });
  }

  private statusCodeForError(error: unknown): number {
    return error instanceof WorkspaceError ? 400 : 500;
  }
}
