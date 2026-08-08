import { AgentConfig } from "../../../config/model/core/AgentConfig.js";
import { AgentHttpServer } from "../../../http/server/core/AgentHttpServer.js";
import { AgentRuntimeFactory } from "../../runtime/factory/core/AgentRuntimeFactory.js";
import { AgentApplicationComponentsFactory } from "./AgentApplicationComponentsFactory.js";

export class AgentApplicationFactory {
  private readonly componentsFactory = new AgentApplicationComponentsFactory();
  private readonly runtimeFactory = new AgentRuntimeFactory();

  createServer(): AgentHttpServer {
    const config = AgentConfig.fromEnv();
    const components = this.componentsFactory.create(config);
    const runtime = this.runtimeFactory.create(
      config,
      components.memoryComponents,
      components.ragComponents,
      components.webComponents,
      components.workspaceComponents,
      components.mcpComponents
    );
    return new AgentHttpServer(config, runtime, components.workspaceComponents.manager, components.mcpComponents.toolService);
  }
}
