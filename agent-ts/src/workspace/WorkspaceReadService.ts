import type { WorkspaceFileReader } from "./WorkspaceFileReader.js";
import type { WorkspaceListing } from "./model/WorkspaceListing.js";
import type { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import { WorkspaceReadServiceComponents } from "./WorkspaceReadServiceComponents.js";
import { WorkspaceReadServiceComponentsFactory } from "./WorkspaceReadServiceComponentsFactory.js";
import type { WorkspaceSessionPathProvider } from "./WorkspaceSessionPathProvider.js";

export class WorkspaceReadService {
  private readonly components: WorkspaceReadServiceComponents;
  private readonly componentsFactory = new WorkspaceReadServiceComponentsFactory();

  constructor(
    fileReader: WorkspaceFileReader,
    listingBuilder: WorkspaceListingBuilder,
    pathGuard: WorkspacePathGuard,
    sessionPathProvider: WorkspaceSessionPathProvider
  ) {
    this.components = this.componentsFactory.create(fileReader, listingBuilder, pathGuard, sessionPathProvider);
  }

  async read(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    offset = 0,
    limit = 8192
  ): Promise<string> {
    return this.components.fileReadService.read(userId, sessionId, relativePath, offset, limit);
  }

  async list(
    userId: number | null,
    sessionId: number | null,
    relativePath = ".",
    recursive = false
  ): Promise<WorkspaceListing[]> {
    return this.components.listService.list(userId, sessionId, relativePath, recursive);
  }
}
