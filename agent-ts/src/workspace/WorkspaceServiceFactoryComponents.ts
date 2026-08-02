import path from "node:path";
import { WorkspaceFileSystem } from "./files/WorkspaceFileSystem.js";
import { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import { WorkspaceSessionPathProvider } from "./WorkspaceSessionPathProvider.js";
import { WorkspaceTargetPathResolver } from "./WorkspaceTargetPathResolver.js";

export class WorkspaceServiceFactoryComponents {
  readonly fileSystem = new WorkspaceFileSystem();
  readonly pathGuard: WorkspacePathGuard;
  readonly sessionPathProvider: WorkspaceSessionPathProvider;
  readonly targetPathResolver: WorkspaceTargetPathResolver;

  constructor(basePath: string) {
    const resolvedBasePath = path.resolve(basePath);
    this.pathGuard = new WorkspacePathGuard(resolvedBasePath);
    this.sessionPathProvider = new WorkspaceSessionPathProvider(this.pathGuard);
    this.targetPathResolver = new WorkspaceTargetPathResolver(this.pathGuard, this.sessionPathProvider);
  }
}
