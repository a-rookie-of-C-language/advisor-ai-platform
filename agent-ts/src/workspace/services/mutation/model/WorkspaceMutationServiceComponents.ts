import type { WorkspaceDirectoryCreator } from "../../../files/mutation/directory/WorkspaceDirectoryCreator.js";
import type { WorkspaceFileEditor } from "../../../files/mutation/file/WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "../../../files/mutation/file/WorkspaceFileWriter.js";
import type { WorkspaceWorkingFileCounter } from "../../../maintenance/support/WorkspaceWorkingFileCounter.js";
import type { WorkspacePathGuard } from "../../../path/guard/WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "../../../path/target/WorkspaceTargetPathResolver.js";
import { WorkspaceCreateDirService } from "../operation/directory/WorkspaceCreateDirService.js";
import { WorkspaceEditService } from "../operation/file/edit/WorkspaceEditService.js";
import { WorkspaceWriteService } from "../operation/file/write/WorkspaceWriteService.js";

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
