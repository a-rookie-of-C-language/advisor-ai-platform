import { AgentConfig } from "./config/AgentConfig.js";
import { AgentHttpServer } from "./http/AgentHttpServer.js";
import { AgentMemoryComponents } from "./AgentMemoryComponents.js";
import { AgentMcpComponents } from "./AgentMcpComponents.js";
import { AgentRagComponents } from "./AgentRagComponents.js";
import { AgentRuntimeFactory } from "./AgentRuntimeFactory.js";
import { AgentWebComponents } from "./AgentWebComponents.js";
import { AgentWorkspaceComponents } from "./AgentWorkspaceComponents.js";

export class AgentApplicationFactory {
  private readonly runtimeFactory = new AgentRuntimeFactory();

  createServer(): AgentHttpServer {
    const config = AgentConfig.fromEnv();
    const memoryComponents = new AgentMemoryComponents(config);
    const ragComponents = new AgentRagComponents(config);
    const webComponents = new AgentWebComponents(config);
    const mcpComponents = new AgentMcpComponents(config);
    const workspaceComponents = new AgentWorkspaceComponents(config);
    const runtime = this.runtimeFactory.create(
      config,
      memoryComponents,
      ragComponents,
      webComponents,
      workspaceComponents,
      mcpComponents
    );
    return new AgentHttpServer(config, runtime, workspaceComponents.manager, mcpComponents.toolService);
  }
}
