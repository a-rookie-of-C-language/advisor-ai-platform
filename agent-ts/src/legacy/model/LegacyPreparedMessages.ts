import type { ChatMessageDTO } from "../../common/model/ChatMessageDTO.js";

export interface LegacyPreparedMessages {
  readonly modelMessages: readonly ChatMessageDTO[];
  readonly userQuery: string;
  readonly memoryEnabled: boolean;
  readonly compactionStats?: {
    readonly tokensBefore: number;
    readonly tokensAfter: number;
    readonly tokensReleased: number;
    readonly compacted: boolean;
    readonly droppedMessages: number;
    readonly autoCompacted: boolean;
    readonly transcriptPath: string;
    readonly latencyMs: number;
  };
}
