import type { WorkspaceFileWriter } from "../../../../../files/mutation/file/write/WorkspaceFileWriter.js";
import type { WorkspaceWorkingFileCounter } from "../../../../../maintenance/support/WorkspaceWorkingFileCounter.js";
import type { WorkspaceWriteResult } from "../../../../../model/result/mutation/file/write/WorkspaceWriteResult.js";
import type { WorkspacePathGuard } from "../../../../../path/guard/WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "../../../../../path/target/WorkspaceTargetPathResolver.js";

export class WorkspaceWriteService {
  constructor(
    private readonly fileWriter: WorkspaceFileWriter,
    private readonly pathGuard: WorkspacePathGuard,
    private readonly targetPathResolver: WorkspaceTargetPathResolver,
    private readonly workingFileCounter: WorkspaceWorkingFileCounter
  ) {}

  async write(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    content: string,
    isFinal = false
  ): Promise<WorkspaceWriteResult> {
    const target = await this.targetPathResolver.resolveEnsuredTarget(userId, sessionId, relativePath, isFinal);
    this.pathGuard.checkFileLimit(await this.workingFileCounter.count(target.sessionPath));
    return this.fileWriter.write(target.sessionPath, target.targetPath, content);
  }
}
