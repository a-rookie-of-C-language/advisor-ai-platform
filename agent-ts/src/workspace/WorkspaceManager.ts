import path from "node:path";
import { WorkspaceCacheCleaner } from "./WorkspaceCacheCleaner.js";
import type { WorkspaceCacheCleanupResult } from "./WorkspaceCacheCleanupResult.js";
import type { WorkspaceCreateDirResult } from "./WorkspaceCreateDirResult.js";
import { WorkspaceDirectoryCreator } from "./WorkspaceDirectoryCreator.js";
import type { WorkspaceEditResult } from "./WorkspaceEditResult.js";
import { WorkspaceFileEditor } from "./WorkspaceFileEditor.js";
import { WorkspaceFileReader } from "./WorkspaceFileReader.js";
import { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import type { WorkspaceListing } from "./WorkspaceListing.js";
import { WorkspaceFileSystem } from "./WorkspaceFileSystem.js";
import { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import { WorkspaceMaintenanceService } from "./WorkspaceMaintenanceService.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";
import { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import { WorkspaceReadService } from "./WorkspaceReadService.js";
import { WorkspaceSessionPathProvider } from "./WorkspaceSessionPathProvider.js";
import type { WorkspaceStats } from "./WorkspaceStats.js";
import { WorkspaceStatsCollector } from "./WorkspaceStatsCollector.js";
import { WorkspaceTargetPathResolver } from "./WorkspaceTargetPathResolver.js";
import { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";
import type { WorkspaceWriteResult } from "./WorkspaceWriteResult.js";

export class WorkspaceManager {
  private readonly fileSystem = new WorkspaceFileSystem();
  private readonly cacheCleaner = new WorkspaceCacheCleaner(this.fileSystem);
  private readonly maintenanceService: WorkspaceMaintenanceService;
  private readonly mutationService: WorkspaceMutationService;
  private readonly pathGuard: WorkspacePathGuard;
  private readonly readService: WorkspaceReadService;
  private readonly sessionPathProvider: WorkspaceSessionPathProvider;
  private readonly targetPathResolver: WorkspaceTargetPathResolver;
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    this.pathGuard = new WorkspacePathGuard(this.basePath);
    this.sessionPathProvider = new WorkspaceSessionPathProvider(this.pathGuard);
    this.targetPathResolver = new WorkspaceTargetPathResolver(this.pathGuard, this.sessionPathProvider);
    this.mutationService = new WorkspaceMutationService(
      new WorkspaceDirectoryCreator(),
      new WorkspaceFileEditor(),
      new WorkspaceFileWriter(),
      this.pathGuard,
      this.targetPathResolver,
      new WorkspaceWorkingFileCounter(this.fileSystem)
    );
    this.readService = new WorkspaceReadService(
      new WorkspaceFileReader(),
      new WorkspaceListingBuilder(this.fileSystem),
      this.pathGuard,
      this.sessionPathProvider
    );
    this.maintenanceService = new WorkspaceMaintenanceService(
      this.cacheCleaner,
      this.sessionPathProvider,
      new WorkspaceStatsCollector(this.fileSystem)
    );
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
