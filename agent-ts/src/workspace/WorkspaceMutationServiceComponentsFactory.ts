import type { WorkspaceDirectoryCreator } from "./files/WorkspaceDirectoryCreator.js";
import type { WorkspaceFileEditor } from "./files/WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "./files/WorkspaceFileWriter.js";
import { WorkspaceMutationServiceComponents } from "./WorkspaceMutationServiceComponents.js";
import type { WorkspacePathGuard } from "./path/WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "./path/WorkspaceTargetPathResolver.js";
import type { WorkspaceWorkingFileCounter } from "./maintenance/WorkspaceWorkingFileCounter.js";

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
