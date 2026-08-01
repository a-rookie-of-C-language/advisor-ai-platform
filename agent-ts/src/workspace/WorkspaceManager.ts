import type { WorkspaceCacheCleanupResult } from "./WorkspaceCacheCleanupResult.js";
import type { WorkspaceCreateDirResult } from "./WorkspaceCreateDirResult.js";
import type { WorkspaceEditResult } from "./WorkspaceEditResult.js";
import type { WorkspaceListing } from "./WorkspaceListing.js";
import { WorkspaceMaintenanceService } from "./WorkspaceMaintenanceService.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";
import { WorkspaceReadService } from "./WorkspaceReadService.js";
import { WorkspaceServiceFactory } from "./WorkspaceServiceFactory.js";
import type { WorkspaceStats } from "./WorkspaceStats.js";
import type { WorkspaceWriteResult } from "./WorkspaceWriteResult.js";

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
