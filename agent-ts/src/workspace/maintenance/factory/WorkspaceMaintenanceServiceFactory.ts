import { WorkspaceCacheCleaner } from "../operation/WorkspaceCacheCleaner.js";
import { WorkspaceMaintenanceService } from "../core/WorkspaceMaintenanceService.js";
import type { WorkspaceServiceFactoryComponents } from "../../core/factory/components/WorkspaceServiceFactoryComponents.js";
import { WorkspaceStatsCollector } from "../operation/WorkspaceStatsCollector.js";

export class WorkspaceMaintenanceServiceFactory {
  create(components: WorkspaceServiceFactoryComponents): WorkspaceMaintenanceService {
    return new WorkspaceMaintenanceService(
      new WorkspaceCacheCleaner(components.fileSystem),
      components.sessionPathProvider,
      new WorkspaceStatsCollector(components.fileSystem)
    );
  }
}
