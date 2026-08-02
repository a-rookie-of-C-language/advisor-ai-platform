import { WorkspaceFileReader } from "./files/WorkspaceFileReader.js";
import { WorkspaceListingBuilder } from "./files/WorkspaceListingBuilder.js";
import { WorkspaceReadService } from "./WorkspaceReadService.js";
import type { WorkspaceServiceFactoryComponents } from "./WorkspaceServiceFactoryComponents.js";

export class WorkspaceReadServiceFactory {
  create(components: WorkspaceServiceFactoryComponents): WorkspaceReadService {
    return new WorkspaceReadService(
      new WorkspaceFileReader(),
      new WorkspaceListingBuilder(components.fileSystem),
      components.pathGuard,
      components.sessionPathProvider
    );
  }
}
