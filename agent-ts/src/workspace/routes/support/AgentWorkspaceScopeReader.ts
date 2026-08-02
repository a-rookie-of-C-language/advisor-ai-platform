import type { AgentWorkspaceScope } from "../model/AgentWorkspaceScope.js";

export class AgentWorkspaceScopeReader {
  read(url: URL): AgentWorkspaceScope {
    return {
      userId: this.readNullableInt(url.searchParams.get("userId")),
      sessionId: this.readNullableInt(url.searchParams.get("sessionId"))
    };
  }

  private readNullableInt(value: string | null): number | null {
    if (!value) {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
