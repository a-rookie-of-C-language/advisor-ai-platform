import type { AgentOpenAiToolFacade } from "../core/AgentOpenAiToolFacade.js";
import type { AgentToolExecutorFactory } from "../factory/AgentToolExecutorFactory.js";

export interface AgentOpenAiToolComponents {
  openAiToolFacade: AgentOpenAiToolFacade;
  toolExecutorFactory: AgentToolExecutorFactory;
}
