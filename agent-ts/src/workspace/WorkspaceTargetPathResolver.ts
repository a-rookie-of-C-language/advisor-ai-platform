import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import type { WorkspaceSessionPathProvider } from "./WorkspaceSessionPathProvider.js";
import type { WorkspaceTargetPath } from "./model/WorkspaceTargetPath.js";

export class WorkspaceTargetPathResolver {
  constructor(
    private readonly pathGuard: WorkspacePathGuard,
    private readonly sessionPathProvider: WorkspaceSessionPathProvider
  ) {}

  async resolveEnsuredTarget(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    isFinal: boolean
  ): Promise<WorkspaceTargetPath> {
    const sessionPath = await this.sessionPathProvider.ensureSessionPath(userId, sessionId);
    const normalPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    const targetPath = isFinal ? this.pathGuard.finalPath(sessionPath, relativePath) : normalPath;
    this.pathGuard.checkDepth(sessionPath, targetPath);
    return { sessionPath, normalPath, targetPath };
  }

  resolveExistingTarget(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    isFinal: boolean
  ): WorkspaceTargetPath {
    const sessionPath = this.sessionPathProvider.getSessionPath(userId, sessionId);
    const normalPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    const targetPath = isFinal ? this.pathGuard.finalPath(sessionPath, relativePath) : normalPath;
    return { sessionPath, normalPath, targetPath };
  }
}
