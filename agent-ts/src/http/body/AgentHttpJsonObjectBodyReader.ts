import type { IncomingMessage } from "node:http";
import { WorkspaceError } from "../../workspace/model/error/WorkspaceError.js";
import { parseJsonBody } from "./HttpBodyParser.js";

export class AgentHttpJsonObjectBodyReader {
  async read(request: IncomingMessage): Promise<Record<string, unknown>> {
    const body = await parseJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new WorkspaceError("请求体必须是 JSON 对象");
    }
    return body as Record<string, unknown>;
  }
}
