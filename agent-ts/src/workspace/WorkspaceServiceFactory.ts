import path from "node:path";
import { WorkspaceCacheCleaner } from "./WorkspaceCacheCleaner.js";
import { WorkspaceDirectoryCreator } from "./WorkspaceDirectoryCreator.js";
import { WorkspaceFileEditor } from "./WorkspaceFileEditor.js";
import { WorkspaceFileReader } from "./WorkspaceFileReader.js";
import { WorkspaceFileSystem } from "./WorkspaceFileSystem.js";
import { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import { WorkspaceMaintenanceService } from "./WorkspaceMaintenanceService.js";
import { WorkspaceMutationService } from "./WorkspaceMutationService.js";
import { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import { WorkspaceReadService } from "./WorkspaceReadService.js";
import { WorkspaceSessionPathProvider } from "./WorkspaceSessionPathProvider.js";
import { WorkspaceStatsCollector } from "./WorkspaceStatsCollector.js";
import { WorkspaceTargetPathResolver } from "./WorkspaceTargetPathResolver.js";
import { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";

export class WorkspaceServiceFactory {
  private readonly basePath: string;
  private readonly fileSystem = new WorkspaceFileSystem();
  private readonly pathGuard: WorkspacePathGuard;
  private readonly sessionPathProvider: WorkspaceSessionPathProvider;
  private readonly targetPathResolver: WorkspaceTargetPathResolver;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    this.pathGuard = new WorkspacePathGuard(this.basePath);
    this.sessionPathProvider = new WorkspaceSessionPathProvider(this.pathGuard);
    this.targetPathResolver = new WorkspaceTargetPathResolver(this.pathGuard, this.sessionPathProvider);
  }

  createMaintenanceService(): WorkspaceMaintenanceService {
    return new WorkspaceMaintenanceService(
      new WorkspaceCacheCleaner(this.fileSystem),
      this.sessionPathProvider,
      new WorkspaceStatsCollector(this.fileSystem)
    );
  }

  createMutationService(): WorkspaceMutationService {
    return new WorkspaceMutationService(
      new WorkspaceDirectoryCreator(),
      new WorkspaceFileEditor(),
      new WorkspaceFileWriter(),
      this.pathGuard,
      this.targetPathResolver,
      new WorkspaceWorkingFileCounter(this.fileSystem)
    );
  }

  createReadService(): WorkspaceReadService {
    return new WorkspaceReadService(
      new WorkspaceFileReader(),
      new WorkspaceListingBuilder(this.fileSystem),
      this.pathGuard,
      this.sessionPathProvider
    );
  }
}
