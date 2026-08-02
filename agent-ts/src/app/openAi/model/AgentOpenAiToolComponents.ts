import type { AgentOpenAiToolFacade } from "../AgentOpenAiToolFacade.js";
import type { AgentToolExecutorFactory } from "../AgentToolExecutorFactory.js";

export interface AgentOpenAiToolComponents {
  openAiToolFacade: AgentOpenAiToolFacade;
  toolExecutorFactory: AgentToolExecutorFactory;
}
