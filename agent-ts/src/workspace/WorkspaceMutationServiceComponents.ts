import { WorkspaceCreateDirService } from "./WorkspaceCreateDirService.js";
import type { WorkspaceDirectoryCreator } from "./files/WorkspaceDirectoryCreator.js";
import { WorkspaceEditService } from "./WorkspaceEditService.js";
import type { WorkspaceFileEditor } from "./files/WorkspaceFileEditor.js";
import type { WorkspaceFileWriter } from "./files/WorkspaceFileWriter.js";
import type { WorkspacePathGuard } from "./path/WorkspacePathGuard.js";
import type { WorkspaceTargetPathResolver } from "./path/WorkspaceTargetPathResolver.js";
import type { WorkspaceWorkingFileCounter } from "./maintenance/WorkspaceWorkingFileCounter.js";
import { WorkspaceWriteService } from "./WorkspaceWriteService.js";

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
