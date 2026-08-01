import type { WorkspaceCreateDirResult } from "./WorkspaceCreateDirResult.js";
import type { WorkspaceDirectoryCreator } from "./WorkspaceDirectoryCreator.js";
import type { WorkspaceEditResult } from "./WorkspaceEditResult.js";
import type { WorkspaceFileEditor } from "./WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "./WorkspaceTargetPathResolver.js";
import type { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";
import type { WorkspaceWriteResult } from "./WorkspaceWriteResult.js";

export class WorkspaceMutationService {
  constructor(
    private readonly directoryCreator: WorkspaceDirectoryCreator,
    private readonly fileEditor: WorkspaceFileEditor,
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

  async edit(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    oldString: string,
    newString: string,
    isFinal = false
  ): Promise<WorkspaceEditResult> {
    const target = this.targetPathResolver.resolveExistingTarget(userId, sessionId, relativePath, isFinal);
    return this.fileEditor.edit(target.sessionPath, target.normalPath, target.targetPath, oldString, newString);
  }

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
