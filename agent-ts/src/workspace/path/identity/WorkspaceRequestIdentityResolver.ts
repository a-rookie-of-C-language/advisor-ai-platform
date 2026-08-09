import type { ChatStreamRequest } from "../../../common/model/ChatStreamRequest.js";

export class WorkspaceRequestIdentityResolver {
  resolve(request: ChatStreamRequest): { userId: number | null; sessionId: number | null } {
    return {
      userId: request.userId ?? null,
      sessionId: request.sessionId ?? null
    };
  }
}
