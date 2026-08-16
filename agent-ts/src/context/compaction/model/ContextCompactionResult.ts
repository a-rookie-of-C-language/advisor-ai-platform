import type { ChatMessageDTO } from "../../../common/model/ChatMessageDTO.js";

export interface ContextCompactionResult {
  messages: ChatMessageDTO[];
  tokensBefore: number;
  tokensAfter: number;
  tokensReleased: number;
  compacted: boolean;
  droppedMessages: number;
}
