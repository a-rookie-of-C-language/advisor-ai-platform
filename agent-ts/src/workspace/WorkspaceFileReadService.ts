import type { WorkspaceFileReader } from "./files/WorkspaceFileReader.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";

export class WorkspaceFileReadService {
  constructor(
    private readonly fileReader: WorkspaceFileReader,
    private readonly pathGuard: WorkspacePathGuard
  ) {}

  async read(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    offset = 0,
    limit = 8192
  ): Promise<string> {
    const targetPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    return this.fileReader.read(targetPath, relativePath, offset, limit);
  }
}
