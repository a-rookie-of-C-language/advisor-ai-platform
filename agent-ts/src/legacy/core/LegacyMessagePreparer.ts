import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import { LatestUserQueryResolver } from "../../common/request/resolver/LatestUserQueryResolver.js";
import type { AgentContextPipeline } from "../../app/session/core/pipeline/AgentContextPipeline.js";
import type { LegacyPreparedMessages } from "../model/LegacyPreparedMessages.js";

export class LegacyMessagePreparer {
  private readonly latestUserQueryResolver = new LatestUserQueryResolver();

  constructor(private readonly contextPipeline: AgentContextPipeline) {}

  async prepare(request: ChatStreamRequest): Promise<LegacyPreparedMessages> {
    const userQuery = this.latestUserQueryResolver.resolve(request);
    const modelMessages = await this.contextPipeline.build(request);
    return {
      modelMessages,
      userQuery,
      memoryEnabled: modelMessages.length > request.messages.length
    };
  }
}
