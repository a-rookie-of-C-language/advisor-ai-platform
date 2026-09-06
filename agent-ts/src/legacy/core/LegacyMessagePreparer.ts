import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import { LatestUserQueryResolver } from "../../common/request/resolver/LatestUserQueryResolver.js";
import type { AgentContextPipeline } from "../../app/session/core/pipeline/AgentContextPipeline.js";
import type { ContextCompactionService } from "../../context/compaction/core/ContextCompactionService.js";
import type { LegacyPreparedMessages } from "../model/LegacyPreparedMessages.js";

export class LegacyMessagePreparer {
  private readonly latestUserQueryResolver = new LatestUserQueryResolver();

  constructor(
    private readonly contextPipeline: AgentContextPipeline,
    private readonly contextCompactionService: ContextCompactionService
  ) {}

  async prepare(request: ChatStreamRequest): Promise<LegacyPreparedMessages> {
    const userQuery = this.latestUserQueryResolver.resolve(request);
    const contextMessages = await this.contextPipeline.build(request);
    const compactResult = this.contextCompactionService.compact([...contextMessages]);
    return {
      modelMessages: compactResult.messages,
      userQuery,
      memoryEnabled: compactResult.messages.length > request.messages.length,
      compactionStats: {
        tokensBefore: compactResult.tokensBefore,
        tokensAfter: compactResult.tokensAfter,
        tokensReleased: compactResult.tokensReleased,
        compacted: compactResult.compacted,
        droppedMessages: compactResult.droppedMessages,
        autoCompacted: compactResult.autoCompacted,
        transcriptPath: compactResult.transcriptPath,
        latencyMs: compactResult.latencyMs
      }
    };
  }
}
