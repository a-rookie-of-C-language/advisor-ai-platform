import type { OpenAiToolRegistry } from "../../openai/tools/registry/core/OpenAiToolRegistry.js";
import { AgentOpenAiToolFacade } from "./core/AgentOpenAiToolFacade.js";
import { AgentToolExecutorFactory } from "./factory/AgentToolExecutorFactory.js";
import type { AgentOpenAiToolComponents } from "./model/AgentOpenAiToolComponents.js";

export class AgentOpenAiToolComponentsFactory {
  create(openAiApiKey: string, openAiToolRegistry?: OpenAiToolRegistry): AgentOpenAiToolComponents {
    const openAiToolFacade = new AgentOpenAiToolFacade(openAiApiKey, openAiToolRegistry);
    return {
      openAiToolFacade,
      toolExecutorFactory: new AgentToolExecutorFactory(openAiToolFacade)
    };
  }
}
