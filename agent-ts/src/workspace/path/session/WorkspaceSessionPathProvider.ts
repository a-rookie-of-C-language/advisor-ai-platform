import { promises as fs } from "node:fs";
import type { WorkspacePathGuard } from "../guard/WorkspacePathGuard.js";

export class WorkspaceSessionPathProvider {
  constructor(private readonly pathGuard: WorkspacePathGuard) {}

  getSessionPath(userId: number | null, sessionId: number | null): string {
    return this.pathGuard.getSessionPath(userId, sessionId);
  }

  async ensureSessionPath(userId: number | null, sessionId: number | null): Promise<string> {
    const sessionPath = this.getSessionPath(userId, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });
    return sessionPath;
  }
}
