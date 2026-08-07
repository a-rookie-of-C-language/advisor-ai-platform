import type { WorkspaceFileReader } from "../../../files/read/WorkspaceFileReader.js";
import type { WorkspaceListingBuilder } from "../../../files/read/WorkspaceListingBuilder.js";
import type { WorkspacePathGuard } from "../../../path/WorkspacePathGuard.js";
import type { WorkspaceSessionPathProvider } from "../../../path/WorkspaceSessionPathProvider.js";
import { WorkspaceReadServiceComponents } from "../model/WorkspaceReadServiceComponents.js";

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
