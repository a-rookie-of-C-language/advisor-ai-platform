import type { WorkspaceServiceFactoryComponents } from "../../../core/WorkspaceServiceFactoryComponents.js";
import { WorkspaceDirectoryCreator } from "../../../files/mutation/WorkspaceDirectoryCreator.js";
import { WorkspaceFileEditor } from "../../../files/mutation/WorkspaceFileEditor.js";
import { WorkspaceFileWriter } from "../../../files/mutation/WorkspaceFileWriter.js";
import { WorkspaceWorkingFileCounter } from "../../../maintenance/WorkspaceWorkingFileCounter.js";
import { WorkspaceMutationService } from "../core/WorkspaceMutationService.js";

export class WorkspaceMutationServiceFactory {
  create(components: WorkspaceServiceFactoryComponents): WorkspaceMutationService {
    return new WorkspaceMutationService(
      new WorkspaceDirectoryCreator(),
      new WorkspaceFileEditor(),
      new WorkspaceFileWriter(),
      components.pathGuard,
      components.targetPathResolver,
      new WorkspaceWorkingFileCounter(components.fileSystem)
    );
  }
}
