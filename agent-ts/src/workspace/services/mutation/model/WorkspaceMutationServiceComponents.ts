import type { WorkspaceDirectoryCreator } from "../../../files/mutation/WorkspaceDirectoryCreator.js";
import type { WorkspaceFileEditor } from "../../../files/mutation/WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "../../../files/mutation/WorkspaceFileWriter.js";
import type { WorkspaceWorkingFileCounter } from "../../../maintenance/support/WorkspaceWorkingFileCounter.js";
import type { WorkspacePathGuard } from "../../../path/guard/WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "../../../path/target/WorkspaceTargetPathResolver.js";
import { WorkspaceCreateDirService } from "../operation/WorkspaceCreateDirService.js";
import { WorkspaceEditService } from "../operation/WorkspaceEditService.js";
import { WorkspaceWriteService } from "../operation/WorkspaceWriteService.js";

export class WorkspaceMutationServiceComponents {
  readonly createDirService: WorkspaceCreateDirService;
  readonly editService: WorkspaceEditService;
  readonly writeService: WorkspaceWriteService;

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
}
