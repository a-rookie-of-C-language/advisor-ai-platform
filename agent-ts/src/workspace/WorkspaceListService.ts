import type { WorkspaceListing } from "./WorkspaceListing.js";
import type { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import type { WorkspaceSessionPathProvider } from "./WorkspaceSessionPathProvider.js";

export class WorkspaceListService {
  constructor(
    private readonly listingBuilder: WorkspaceListingBuilder,
    private readonly pathGuard: WorkspacePathGuard,
    private readonly sessionPathProvider: WorkspaceSessionPathProvider
  ) {}

  async list(
    userId: number | null,
    sessionId: number | null,
    relativePath = ".",
    recursive = false
  ): Promise<WorkspaceListing[]> {
    await this.sessionPathProvider.ensureSessionPath(userId, sessionId);
    const targetPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    return this.listingBuilder.build(targetPath, recursive);
  }
}
