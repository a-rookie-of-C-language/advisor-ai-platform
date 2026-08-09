import type { AgentOpenAiToolFacade } from "../core/AgentOpenAiToolFacade.js";
import type { AgentToolExecutorFactory } from "../factory/executor/AgentToolExecutorFactory.js";

export interface AgentOpenAiToolComponents {
  openAiToolFacade: AgentOpenAiToolFacade;
  toolExecutorFactory: AgentToolExecutorFactory;
}
