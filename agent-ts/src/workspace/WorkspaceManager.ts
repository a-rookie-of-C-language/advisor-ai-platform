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
  private readonly directoryCreator = new WorkspaceDirectoryCreator();
  private readonly fileEditor = new WorkspaceFileEditor();
  private readonly fileWriter = new WorkspaceFileWriter();
  private readonly workingFileCounter = new WorkspaceWorkingFileCounter(this.fileSystem);
  private readonly maintenanceService: WorkspaceMaintenanceService;
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
    const target = await this.targetPathResolver.resolveEnsuredTarget(userId, sessionId, relativePath, isFinal);
    this.pathGuard.checkFileLimit(await this.workingFileCounter.count(target.sessionPath));

    return this.fileWriter.write(target.sessionPath, target.targetPath, content);
  }

  async edit(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    oldString: string,
    newString: string,
    isFinal = false
  ): Promise<WorkspaceEditResult> {
    const target = this.targetPathResolver.resolveExistingTarget(userId, sessionId, relativePath, isFinal);
    return this.fileEditor.edit(target.sessionPath, target.normalPath, target.targetPath, oldString, newString);
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
    const target = await this.targetPathResolver.resolveEnsuredTarget(userId, sessionId, relativePath, isFinal);

    return this.directoryCreator.create(target.sessionPath, target.targetPath);
  }

  async cleanupCache(userId: number | null, sessionId: number | null): Promise<WorkspaceCacheCleanupResult> {
    return this.maintenanceService.cleanupCache(userId, sessionId);
  }

  async getStats(userId: number | null, sessionId: number | null): Promise<WorkspaceStats> {
    return this.maintenanceService.getStats(userId, sessionId);
  }
}
