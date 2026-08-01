import type { WorkspaceCreateDirResult } from "./WorkspaceCreateDirResult.js";
import { WorkspaceCreateDirService } from "./WorkspaceCreateDirService.js";
import type { WorkspaceDirectoryCreator } from "./WorkspaceDirectoryCreator.js";
import type { WorkspaceEditResult } from "./WorkspaceEditResult.js";
import { WorkspaceEditService } from "./WorkspaceEditService.js";
import type { WorkspaceFileEditor } from "./WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "./WorkspaceTargetPathResolver.js";
import type { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";
import type { WorkspaceWriteResult } from "./WorkspaceWriteResult.js";
import { WorkspaceWriteService } from "./WorkspaceWriteService.js";

export class WorkspaceMutationService {
  private readonly createDirService: WorkspaceCreateDirService;
  private readonly editService: WorkspaceEditService;
  private readonly writeService: WorkspaceWriteService;

  constructor(
    directoryCreator: WorkspaceDirectoryCreator,
    fileEditor: WorkspaceFileEditor,
    fileWriter: WorkspaceFileWriter,
    pathGuard: WorkspacePathGuard,
    targetPathResolver: WorkspaceTargetPathResolver,
    workingFileCounter: WorkspaceWorkingFileCounter
  ) {
    this.createDirService = new WorkspaceCreateDirService(directoryCreator, targetPathResolver);
    this.editService = new WorkspaceEditService(fileEditor, targetPathResolver);
    this.writeService = new WorkspaceWriteService(fileWriter, pathGuard, targetPathResolver, workingFileCounter);
  }

  async write(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    content: string,
    isFinal = false
  ): Promise<WorkspaceWriteResult> {
    return this.writeService.write(userId, sessionId, relativePath, content, isFinal);
  }

  async edit(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    oldString: string,
    newString: string,
    isFinal = false
  ): Promise<WorkspaceEditResult> {
    return this.editService.edit(userId, sessionId, relativePath, oldString, newString, isFinal);
  }

  async createDir(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    isFinal = false
  ): Promise<WorkspaceCreateDirResult> {
    return this.createDirService.createDir(userId, sessionId, relativePath, isFinal);
  }
}
