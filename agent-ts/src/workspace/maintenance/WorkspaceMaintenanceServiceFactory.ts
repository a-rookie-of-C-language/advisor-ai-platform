import { WorkspaceCacheCleaner } from "./WorkspaceCacheCleaner.js";
import { WorkspaceMaintenanceService } from "./WorkspaceMaintenanceService.js";
import type { WorkspaceServiceFactoryComponents } from "../WorkspaceServiceFactoryComponents.js";
import { WorkspaceStatsCollector } from "./WorkspaceStatsCollector.js";

export class WorkspaceMaintenanceServiceFactory {
  create(components: WorkspaceServiceFactoryComponents): WorkspaceMaintenanceService {
    return new WorkspaceMaintenanceService(
      new WorkspaceCacheCleaner(components.fileSystem),
      components.sessionPathProvider,
      new WorkspaceStatsCollector(components.fileSystem)
    );
  }
}
