import { WorkspaceDirectoryCreator } from "./WorkspaceDirectoryCreator.js";
import { WorkspaceFileEditor } from "./WorkspaceFileEditor.js";
import { WorkspaceFileReader } from "./WorkspaceFileReader.js";
import { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import { WorkspaceMaintenanceServiceFactory } from "./WorkspaceMaintenanceServiceFactory.js";
import { WorkspaceMaintenanceService } from "./WorkspaceMaintenanceService.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";
import { WorkspaceReadService } from "./WorkspaceReadService.js";
import { WorkspaceServiceFactoryComponents } from "./WorkspaceServiceFactoryComponents.js";
import { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";

export class WorkspaceServiceFactory {
  private readonly components: WorkspaceServiceFactoryComponents;
  private readonly maintenanceServiceFactory = new WorkspaceMaintenanceServiceFactory();

  constructor(basePath: string) {
    this.components = new WorkspaceServiceFactoryComponents(basePath);
  }

  createMaintenanceService(): WorkspaceMaintenanceService {
    return this.maintenanceServiceFactory.create(this.components);
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
