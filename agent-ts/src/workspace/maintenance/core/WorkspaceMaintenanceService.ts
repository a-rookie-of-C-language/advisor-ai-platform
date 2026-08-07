import type { WorkspaceCacheCleaner } from "../operation/WorkspaceCacheCleaner.js";
import type { WorkspaceCacheCleanupResult } from "../../model/result/WorkspaceCacheCleanupResult.js";
import type { WorkspaceStats } from "../../model/result/WorkspaceStats.js";
import type { WorkspaceSessionPathProvider } from "../../path/WorkspaceSessionPathProvider.js";
import type { WorkspaceStatsCollector } from "../operation/WorkspaceStatsCollector.js";

export class WorkspaceMaintenanceService {
  constructor(
    private readonly cacheCleaner: WorkspaceCacheCleaner,
    private readonly sessionPathProvider: WorkspaceSessionPathProvider,
    private readonly statsCollector: WorkspaceStatsCollector
  ) {}

  async cleanupCache(userId: number | null, sessionId: number | null): Promise<WorkspaceCacheCleanupResult> {
    const sessionPath = this.sessionPathProvider.getSessionPath(userId, sessionId);
    return this.cacheCleaner.clean(sessionPath);
  }

  async getStats(userId: number | null, sessionId: number | null): Promise<WorkspaceStats> {
    const sessionPath = this.sessionPathProvider.getSessionPath(userId, sessionId);
    return this.statsCollector.collect(sessionPath, userId, sessionId);
  }
}
