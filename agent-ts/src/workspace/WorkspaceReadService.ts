import type { WorkspaceFileReader } from "./WorkspaceFileReader.js";
import { WorkspaceFileReadService } from "./WorkspaceFileReadService.js";
import { WorkspaceListService } from "./WorkspaceListService.js";
import type { WorkspaceListing } from "./WorkspaceListing.js";
import type { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import type { WorkspaceSessionPathProvider } from "./WorkspaceSessionPathProvider.js";

export class WorkspaceReadService {
  private readonly fileReadService: WorkspaceFileReadService;
  private readonly listService: WorkspaceListService;

  constructor(
    fileReader: WorkspaceFileReader,
    listingBuilder: WorkspaceListingBuilder,
    pathGuard: WorkspacePathGuard,
    sessionPathProvider: WorkspaceSessionPathProvider
  ) {
    this.fileReadService = new WorkspaceFileReadService(fileReader, pathGuard);
    this.listService = new WorkspaceListService(listingBuilder, pathGuard, sessionPathProvider);
  }

  async read(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    offset = 0,
    limit = 8192
  ): Promise<string> {
    return this.fileReadService.read(userId, sessionId, relativePath, offset, limit);
  }

  async list(
    userId: number | null,
    sessionId: number | null,
    relativePath = ".",
    recursive = false
  ): Promise<WorkspaceListing[]> {
    return this.listService.list(userId, sessionId, relativePath, recursive);
  }
}
