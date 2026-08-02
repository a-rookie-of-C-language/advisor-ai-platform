import type { OpenAiToolRegistry } from "../openai/OpenAiToolRegistry.js";
import type { AgentOpenAiToolComponents } from "./AgentOpenAiToolComponents.js";
import { AgentOpenAiToolFacade } from "./AgentOpenAiToolFacade.js";
import { AgentToolExecutorFactory } from "./AgentToolExecutorFactory.js";

export class AgentOpenAiToolComponentsFactory {
  create(openAiApiKey: string, openAiToolRegistry?: OpenAiToolRegistry): AgentOpenAiToolComponents {
    const openAiToolFacade = new AgentOpenAiToolFacade(openAiApiKey, openAiToolRegistry);
    return {
      openAiToolFacade,
      toolExecutorFactory: new AgentToolExecutorFactory(openAiToolFacade)
    };
  }
}
