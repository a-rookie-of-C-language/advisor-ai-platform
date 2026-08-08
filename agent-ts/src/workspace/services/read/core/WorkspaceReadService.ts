import type { WorkspaceFileReader } from "../../../files/read/file/WorkspaceFileReader.js";
import type { WorkspaceListingBuilder } from "../../../files/read/list/WorkspaceListingBuilder.js";
import type { WorkspaceListing } from "../../../model/result/read/WorkspaceListing.js";
import type { WorkspacePathGuard } from "../../../path/guard/WorkspacePathGuard.js";
import type { WorkspaceSessionPathProvider } from "../../../path/session/WorkspaceSessionPathProvider.js";
import { WorkspaceReadServiceComponentsFactory } from "../factory/WorkspaceReadServiceComponentsFactory.js";
import type { WorkspaceReadServiceComponents } from "../model/WorkspaceReadServiceComponents.js";

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
