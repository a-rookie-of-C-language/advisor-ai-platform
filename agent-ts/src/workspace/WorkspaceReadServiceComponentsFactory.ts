import type { WorkspaceFileReader } from "./WorkspaceFileReader.js";
import type { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import type { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import { WorkspaceReadServiceComponents } from "./WorkspaceReadServiceComponents.js";
import type { WorkspaceSessionPathProvider } from "./WorkspaceSessionPathProvider.js";

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
