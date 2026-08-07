import type { OpenAiToolRegistry } from "../../../../openai/tools/registry/core/OpenAiToolRegistry.js";
import { AgentOpenAiToolFacade } from "../../core/AgentOpenAiToolFacade.js";
import type { AgentOpenAiToolComponents } from "../../model/AgentOpenAiToolComponents.js";
import { AgentToolExecutorFactory } from "../executor/AgentToolExecutorFactory.js";

export class AgentOpenAiToolComponentsFactory {
  create(openAiApiKey: string, openAiToolRegistry?: OpenAiToolRegistry): AgentOpenAiToolComponents {
    const openAiToolFacade = new AgentOpenAiToolFacade(openAiApiKey, openAiToolRegistry);
    return {
      openAiToolFacade,
      toolExecutorFactory: new AgentToolExecutorFactory(openAiToolFacade)
    };
  }
}
