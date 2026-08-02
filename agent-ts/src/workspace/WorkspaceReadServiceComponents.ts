import type { WorkspaceFileReader } from "./WorkspaceFileReader.js";
import { WorkspaceFileReadService } from "./WorkspaceFileReadService.js";
import { WorkspaceListService } from "./WorkspaceListService.js";
import type { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import type { WorkspaceSessionPathProvider } from "./WorkspaceSessionPathProvider.js";

export class WorkspaceReadServiceComponents {
  readonly fileReadService: WorkspaceFileReadService;
  readonly listService: WorkspaceListService;

  constructor(
    fileReader: WorkspaceFileReader,
    listingBuilder: WorkspaceListingBuilder,
    pathGuard: WorkspacePathGuard,
    sessionPathProvider: WorkspaceSessionPathProvider
  ) {
    this.fileReadService = new WorkspaceFileReadService(fileReader, pathGuard);
    this.listService = new WorkspaceListService(listingBuilder, pathGuard, sessionPathProvider);
  }
}
