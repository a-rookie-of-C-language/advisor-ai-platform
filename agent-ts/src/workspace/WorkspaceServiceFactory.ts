import { WorkspaceMaintenanceServiceFactory } from "./WorkspaceMaintenanceServiceFactory.js";
import { WorkspaceMaintenanceService } from "./WorkspaceMaintenanceService.js";
import { WorkspaceMutationServiceFactory } from "./WorkspaceMutationServiceFactory.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";
import { WorkspaceReadService } from "./WorkspaceReadService.js";
import { WorkspaceReadServiceFactory } from "./WorkspaceReadServiceFactory.js";
import { WorkspaceServiceFactoryComponents } from "./WorkspaceServiceFactoryComponents.js";

export class WorkspaceServiceFactory {
  private readonly components: WorkspaceServiceFactoryComponents;
  private readonly maintenanceServiceFactory = new WorkspaceMaintenanceServiceFactory();
  private readonly mutationServiceFactory = new WorkspaceMutationServiceFactory();
  private readonly readServiceFactory = new WorkspaceReadServiceFactory();

  constructor(basePath: string) {
    this.components = new WorkspaceServiceFactoryComponents(basePath);
  }

  createMaintenanceService(): WorkspaceMaintenanceService {
    return this.maintenanceServiceFactory.create(this.components);
  }

  createMutationService(): WorkspaceMutationService {
    return this.mutationServiceFactory.create(this.components);
  }

  createReadService(): WorkspaceReadService {
    return this.readServiceFactory.create(this.components);
  }
}
