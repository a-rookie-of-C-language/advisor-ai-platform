import { WorkspaceDirectoryCreator } from "../../files/WorkspaceDirectoryCreator.js";
import { WorkspaceFileEditor } from "../../files/WorkspaceFileEditor.js";
import { WorkspaceFileWriter } from "../../files/WorkspaceFileWriter.js";
import { WorkspaceWorkingFileCounter } from "../../maintenance/WorkspaceWorkingFileCounter.js";
import type { WorkspaceServiceFactoryComponents } from "../../core/WorkspaceServiceFactoryComponents.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";

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
