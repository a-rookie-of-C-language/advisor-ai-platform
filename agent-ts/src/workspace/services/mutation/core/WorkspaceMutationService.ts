import type { WorkspaceDirectoryCreator } from "../../../files/mutation/WorkspaceDirectoryCreator.js";
import type { WorkspaceFileEditor } from "../../../files/mutation/WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "../../../files/mutation/WorkspaceFileWriter.js";
import type { WorkspaceWorkingFileCounter } from "../../../maintenance/support/WorkspaceWorkingFileCounter.js";
import type { WorkspaceCreateDirResult } from "../../../model/result/mutation/WorkspaceCreateDirResult.js";
import type { WorkspaceEditResult } from "../../../model/result/mutation/WorkspaceEditResult.js";
import type { WorkspaceWriteResult } from "../../../model/result/mutation/WorkspaceWriteResult.js";
import type { WorkspacePathGuard } from "../../../path/guard/WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "../../../path/target/WorkspaceTargetPathResolver.js";
import { WorkspaceMutationServiceComponentsFactory } from "../factory/WorkspaceMutationServiceComponentsFactory.js";
import type { WorkspaceMutationServiceComponents } from "../model/WorkspaceMutationServiceComponents.js";

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
