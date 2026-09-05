import { AgentConfig } from "../../../../config/model/core/AgentConfig.js";
import { AgentHttpServer } from "../../../../http/server/core/AgentHttpServer.js";
import { buildDefaultSkillRegistry } from "../../../../skills/preset/buildDefaultSkillRegistry.js";
import { AgentRuntimeFactory } from "../../../runtime/factory/core/AgentRuntimeFactory.js";
import { AgentApplicationComponentsFactory } from "../components/AgentApplicationComponentsFactory.js";

export class AgentApplicationFactory {
  private readonly componentsFactory = new AgentApplicationComponentsFactory();
  private readonly runtimeFactory = new AgentRuntimeFactory();

  createServer(): AgentHttpServer {
    const config = AgentConfig.fromEnv();
    const components = this.componentsFactory.create(config);
    const skillRegistry = buildDefaultSkillRegistry();
    const runtime = this.runtimeFactory.create(
      config,
      components.memoryComponents,
      components.ragComponents,
      components.webComponents,
      components.workspaceComponents,
      components.mcpComponents,
      skillRegistry
    );
    return new AgentHttpServer(config, runtime, components.workspaceComponents.manager, components.mcpComponents.toolService);
  }
}
