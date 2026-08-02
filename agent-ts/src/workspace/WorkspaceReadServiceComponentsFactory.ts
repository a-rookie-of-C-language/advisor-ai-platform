import type { WorkspaceFileReader } from "./files/WorkspaceFileReader.js";
import type { WorkspaceListingBuilder } from "./files/WorkspaceListingBuilder.js";
import type { WorkspacePathGuard } from "./path/WorkspacePathGuard.js";
import { WorkspaceReadServiceComponents } from "./WorkspaceReadServiceComponents.js";
import type { WorkspaceSessionPathProvider } from "./path/WorkspaceSessionPathProvider.js";

export class WorkspaceReadServiceComponentsFactory {
  create(
    fileReader: WorkspaceFileReader,
    listingBuilder: WorkspaceListingBuilder,
    pathGuard: WorkspacePathGuard,
    sessionPathProvider: WorkspaceSessionPathProvider
  ): WorkspaceReadServiceComponents {
    return new WorkspaceReadServiceComponents(fileReader, listingBuilder, pathGuard, sessionPathProvider);
  }
}
