import type { WorkspaceServiceFactoryComponents } from "../../../core/factory/components/WorkspaceServiceFactoryComponents.js";
import { WorkspaceFileReader } from "../../../files/read/file/WorkspaceFileReader.js";
import { WorkspaceListingBuilder } from "../../../files/read/list/WorkspaceListingBuilder.js";
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
