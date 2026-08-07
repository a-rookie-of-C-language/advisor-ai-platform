import type { WorkspaceFileReader } from "../../../files/read/WorkspaceFileReader.js";
import type { WorkspaceListingBuilder } from "../../../files/read/WorkspaceListingBuilder.js";
import type { WorkspacePathGuard } from "../../../path/WorkspacePathGuard.js";
import type { WorkspaceSessionPathProvider } from "../../../path/WorkspaceSessionPathProvider.js";
import { WorkspaceFileReadService } from "../operation/WorkspaceFileReadService.js";
import { WorkspaceListService } from "../operation/WorkspaceListService.js";

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
