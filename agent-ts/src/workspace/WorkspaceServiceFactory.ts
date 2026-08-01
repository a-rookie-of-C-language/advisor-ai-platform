import { WorkspaceCacheCleaner } from "./WorkspaceCacheCleaner.js";
import { WorkspaceDirectoryCreator } from "./WorkspaceDirectoryCreator.js";
import { WorkspaceFileEditor } from "./WorkspaceFileEditor.js";
import { WorkspaceFileReader } from "./WorkspaceFileReader.js";
import { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import { WorkspaceMaintenanceService } from "./WorkspaceMaintenanceService.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";
import { WorkspaceReadService } from "./WorkspaceReadService.js";
import { WorkspaceServiceFactoryComponents } from "./WorkspaceServiceFactoryComponents.js";
import { WorkspaceStatsCollector } from "./WorkspaceStatsCollector.js";
import { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";

export class WorkspaceServiceFactory {
  private readonly components: WorkspaceServiceFactoryComponents;

  constructor(basePath: string) {
    this.components = new WorkspaceServiceFactoryComponents(basePath);
  }

  createMaintenanceService(): WorkspaceMaintenanceService {
    return new WorkspaceMaintenanceService(
      new WorkspaceCacheCleaner(this.components.fileSystem),
      this.components.sessionPathProvider,
      new WorkspaceStatsCollector(this.components.fileSystem)
    );
  }

  createMutationService(): WorkspaceMutationService {
    return new WorkspaceMutationService(
      new WorkspaceDirectoryCreator(),
      new WorkspaceFileEditor(),
      new WorkspaceFileWriter(),
      this.components.pathGuard,
      this.components.targetPathResolver,
      new WorkspaceWorkingFileCounter(this.components.fileSystem)
    );
  }

  createReadService(): WorkspaceReadService {
    return new WorkspaceReadService(
      new WorkspaceFileReader(),
      new WorkspaceListingBuilder(this.components.fileSystem),
      this.components.pathGuard,
      this.components.sessionPathProvider
    );
  }
}
