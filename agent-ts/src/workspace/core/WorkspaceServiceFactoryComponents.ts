import path from "node:path";
import { WorkspaceFileSystem } from "../files/core/WorkspaceFileSystem.js";
import { WorkspacePathGuard } from "../path/guard/WorkspacePathGuard.js";
import { WorkspaceSessionPathProvider } from "../path/session/WorkspaceSessionPathProvider.js";
import { WorkspaceTargetPathResolver } from "../path/target/WorkspaceTargetPathResolver.js";

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
