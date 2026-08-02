import type { WorkspaceCreateDirResult } from "./model/WorkspaceCreateDirResult.js";
import type { WorkspaceDirectoryCreator } from "./files/WorkspaceDirectoryCreator.js";
import type { WorkspaceEditResult } from "./model/WorkspaceEditResult.js";
import type { WorkspaceFileEditor } from "./files/WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "./files/WorkspaceFileWriter.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import { WorkspaceMutationServiceComponents } from "./WorkspaceMutationServiceComponents.js";
import { WorkspaceMutationServiceComponentsFactory } from "./WorkspaceMutationServiceComponentsFactory.js";
import type { WorkspaceTargetPathResolver } from "./WorkspaceTargetPathResolver.js";
import type { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";
import type { WorkspaceWriteResult } from "./model/WorkspaceWriteResult.js";

export class WorkspaceMutationService {
  private readonly components: WorkspaceMutationServiceComponents;
  private readonly componentsFactory = new WorkspaceMutationServiceComponentsFactory();

  constructor(
    directoryCreator: WorkspaceDirectoryCreator,
    fileEditor: WorkspaceFileEditor,
    fileWriter: WorkspaceFileWriter,
    pathGuard: WorkspacePathGuard,
    targetPathResolver: WorkspaceTargetPathResolver,
    workingFileCounter: WorkspaceWorkingFileCounter
  ) {
    this.components = this.componentsFactory.create(
      directoryCreator,
      fileEditor,
      fileWriter,
      pathGuard,
      targetPathResolver,
      workingFileCounter
    );
  }

  async write(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    content: string,
    isFinal = false
  ): Promise<WorkspaceWriteResult> {
    return this.components.writeService.write(userId, sessionId, relativePath, content, isFinal);
  }

  async edit(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    oldString: string,
    newString: string,
    isFinal = false
  ): Promise<WorkspaceEditResult> {
    return this.components.editService.edit(userId, sessionId, relativePath, oldString, newString, isFinal);
  }

  async createDir(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    isFinal = false
  ): Promise<WorkspaceCreateDirResult> {
    return this.components.createDirService.createDir(userId, sessionId, relativePath, isFinal);
  }
}
