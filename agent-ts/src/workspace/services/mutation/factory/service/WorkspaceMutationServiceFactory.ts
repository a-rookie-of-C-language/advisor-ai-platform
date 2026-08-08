import type { WorkspaceServiceFactoryComponents } from "../../../../core/factory/components/WorkspaceServiceFactoryComponents.js";
import { WorkspaceDirectoryCreator } from "../../../../files/mutation/directory/WorkspaceDirectoryCreator.js";
import { WorkspaceFileEditor } from "../../../../files/mutation/file/edit/WorkspaceFileEditor.js";
import { WorkspaceFileWriter } from "../../../../files/mutation/file/write/WorkspaceFileWriter.js";
import { WorkspaceWorkingFileCounter } from "../../../../maintenance/support/WorkspaceWorkingFileCounter.js";
import { WorkspaceMutationService } from "../../core/WorkspaceMutationService.js";

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
