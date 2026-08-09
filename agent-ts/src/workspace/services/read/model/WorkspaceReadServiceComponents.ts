import type { WorkspaceFileReader } from "../../../files/read/file/WorkspaceFileReader.js";
import type { WorkspaceListingBuilder } from "../../../files/read/list/WorkspaceListingBuilder.js";
import type { WorkspacePathGuard } from "../../../path/guard/WorkspacePathGuard.js";
import type { WorkspaceSessionPathProvider } from "../../../path/session/WorkspaceSessionPathProvider.js";
import { WorkspaceFileReadService } from "../operation/file/WorkspaceFileReadService.js";
import { WorkspaceListService } from "../operation/list/WorkspaceListService.js";

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
