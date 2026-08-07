import type { WorkspaceServiceFactoryComponents } from "../../../core/WorkspaceServiceFactoryComponents.js";
import { WorkspaceFileReader } from "../../../files/read/WorkspaceFileReader.js";
import { WorkspaceListingBuilder } from "../../../files/read/WorkspaceListingBuilder.js";
import { WorkspaceReadService } from "../core/WorkspaceReadService.js";

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
