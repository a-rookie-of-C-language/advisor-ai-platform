import type { WorkspaceDirectoryCreator } from "./WorkspaceDirectoryCreator.js";
import type { WorkspaceFileEditor } from "./WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import { WorkspaceMutationServiceComponents } from "./WorkspaceMutationServiceComponents.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "./WorkspaceTargetPathResolver.js";
import type { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";

export class WorkspaceMutationServiceComponentsFactory {
  create(
    directoryCreator: WorkspaceDirectoryCreator,
    fileEditor: WorkspaceFileEditor,
    fileWriter: WorkspaceFileWriter,
    pathGuard: WorkspacePathGuard,
    targetPathResolver: WorkspaceTargetPathResolver,
    workingFileCounter: WorkspaceWorkingFileCounter
  ): WorkspaceMutationServiceComponents {
    return new WorkspaceMutationServiceComponents(
      directoryCreator,
      fileEditor,
      fileWriter,
      pathGuard,
      targetPathResolver,
      workingFileCounter
    );
  }
}
