import { WorkspaceDirectoryCreator } from "./WorkspaceDirectoryCreator.js";
import { WorkspaceFileEditor } from "./WorkspaceFileEditor.js";
import { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";
import type { WorkspaceServiceFactoryComponents } from "./WorkspaceServiceFactoryComponents.js";
import { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";

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
