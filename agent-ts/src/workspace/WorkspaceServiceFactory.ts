import { WorkspaceDirectoryCreator } from "./WorkspaceDirectoryCreator.js";
import { WorkspaceFileEditor } from "./WorkspaceFileEditor.js";
import { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import { WorkspaceMaintenanceServiceFactory } from "./WorkspaceMaintenanceServiceFactory.js";
import { WorkspaceMaintenanceService } from "./WorkspaceMaintenanceService.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";
import { WorkspaceReadService } from "./WorkspaceReadService.js";
import { WorkspaceReadServiceFactory } from "./WorkspaceReadServiceFactory.js";
import { WorkspaceServiceFactoryComponents } from "./WorkspaceServiceFactoryComponents.js";
import { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";

export class WorkspaceServiceFactory {
  private readonly components: WorkspaceServiceFactoryComponents;
  private readonly maintenanceServiceFactory = new WorkspaceMaintenanceServiceFactory();
  private readonly readServiceFactory = new WorkspaceReadServiceFactory();

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
    return this.readServiceFactory.create(this.components);
  }
}
