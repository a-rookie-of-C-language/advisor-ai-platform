import { WorkspaceMaintenanceService } from "../maintenance/core/WorkspaceMaintenanceService.js";
import type { WorkspaceCacheCleanupResult } from "../model/result/maintenance/WorkspaceCacheCleanupResult.js";
import type { WorkspaceStats } from "../model/result/maintenance/WorkspaceStats.js";
import type { WorkspaceCreateDirResult } from "../model/result/mutation/WorkspaceCreateDirResult.js";
import type { WorkspaceEditResult } from "../model/result/mutation/WorkspaceEditResult.js";
import type { WorkspaceWriteResult } from "../model/result/mutation/WorkspaceWriteResult.js";
import type { WorkspaceListing } from "../model/result/read/WorkspaceListing.js";
import { WorkspaceMutationService } from "../services/mutation/core/WorkspaceMutationService.js";
import { WorkspaceReadService } from "../services/read/core/WorkspaceReadService.js";
import { WorkspaceServiceFactory } from "./WorkspaceServiceFactory.js";

export class WorkspaceManager {
  private readonly maintenanceService: WorkspaceMaintenanceService;
  private readonly mutationService: WorkspaceMutationService;
  private readonly readService: WorkspaceReadService;

  constructor(basePath: string) {
    const serviceFactory = new WorkspaceServiceFactory(basePath);
    this.mutationService = serviceFactory.createMutationService();
    this.readService = serviceFactory.createReadService();
    this.maintenanceService = serviceFactory.createMaintenanceService();
  }

  async read(userId: number | null, sessionId: number | null, relativePath: string, offset = 0, limit = 8192): Promise<string> {
    return this.readService.read(userId, sessionId, relativePath, offset, limit);
  }

  async write(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    content: string,
    isFinal = false
  ): Promise<WorkspaceWriteResult> {
    return this.mutationService.write(userId, sessionId, relativePath, content, isFinal);
  }

  async edit(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    oldString: string,
    newString: string,
    isFinal = false
  ): Promise<WorkspaceEditResult> {
    return this.mutationService.edit(userId, sessionId, relativePath, oldString, newString, isFinal);
  }

  async list(userId: number | null, sessionId: number | null, relativePath = ".", recursive = false): Promise<WorkspaceListing[]> {
    return this.readService.list(userId, sessionId, relativePath, recursive);
  }

  async createDir(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    isFinal = false
  ): Promise<WorkspaceCreateDirResult> {
    return this.mutationService.createDir(userId, sessionId, relativePath, isFinal);
  }

  async cleanupCache(userId: number | null, sessionId: number | null): Promise<WorkspaceCacheCleanupResult> {
    return this.maintenanceService.cleanupCache(userId, sessionId);
  }

  async getStats(userId: number | null, sessionId: number | null): Promise<WorkspaceStats> {
    return this.maintenanceService.getStats(userId, sessionId);
  }
}
