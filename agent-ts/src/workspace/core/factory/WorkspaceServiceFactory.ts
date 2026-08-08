import { WorkspaceMaintenanceService } from "../../maintenance/core/WorkspaceMaintenanceService.js";
import { WorkspaceMaintenanceServiceFactory } from "../../maintenance/factory/WorkspaceMaintenanceServiceFactory.js";
import { WorkspaceMutationService } from "../../services/mutation/core/WorkspaceMutationService.js";
import { WorkspaceMutationServiceFactory } from "../../services/mutation/factory/service/WorkspaceMutationServiceFactory.js";
import { WorkspaceReadService } from "../../services/read/core/WorkspaceReadService.js";
import { WorkspaceReadServiceFactory } from "../../services/read/factory/WorkspaceReadServiceFactory.js";
import { WorkspaceServiceFactoryComponents } from "./components/WorkspaceServiceFactoryComponents.js";

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
