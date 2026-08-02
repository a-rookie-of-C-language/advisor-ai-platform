import { WorkspaceMaintenanceService } from "./maintenance/WorkspaceMaintenanceService.js";
import { WorkspaceMaintenanceServiceFactory } from "./maintenance/WorkspaceMaintenanceServiceFactory.js";
import { WorkspaceMutationServiceFactory } from "./WorkspaceMutationServiceFactory.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";
import { WorkspaceReadService } from "./services/read/WorkspaceReadService.js";
import { WorkspaceReadServiceFactory } from "./services/read/WorkspaceReadServiceFactory.js";
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
