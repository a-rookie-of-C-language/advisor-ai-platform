import type { WorkspaceDirectoryCreator } from "../../../files/mutation/WorkspaceDirectoryCreator.js";
import type { WorkspaceCreateDirResult } from "../../../model/result/mutation/WorkspaceCreateDirResult.js";
import type { WorkspaceTargetPathResolver } from "../../../path/target/WorkspaceTargetPathResolver.js";

export class WorkspaceCreateDirService {
  constructor(
    private readonly directoryCreator: WorkspaceDirectoryCreator,
    private readonly targetPathResolver: WorkspaceTargetPathResolver
  ) {}

  async createDir(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    isFinal = false
  ): Promise<WorkspaceCreateDirResult> {
    const target = await this.targetPathResolver.resolveEnsuredTarget(userId, sessionId, relativePath, isFinal);
    return this.directoryCreator.create(target.sessionPath, target.targetPath);
  }
}
