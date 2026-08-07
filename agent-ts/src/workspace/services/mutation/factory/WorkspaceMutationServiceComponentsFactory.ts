import type { WorkspaceDirectoryCreator } from "../../../files/mutation/WorkspaceDirectoryCreator.js";
import type { WorkspaceFileEditor } from "../../../files/mutation/WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "../../../files/mutation/WorkspaceFileWriter.js";
import type { WorkspaceWorkingFileCounter } from "../../../maintenance/support/WorkspaceWorkingFileCounter.js";
import type { WorkspacePathGuard } from "../../../path/guard/WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "../../../path/target/WorkspaceTargetPathResolver.js";
import { WorkspaceMutationServiceComponents } from "../model/WorkspaceMutationServiceComponents.js";

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
