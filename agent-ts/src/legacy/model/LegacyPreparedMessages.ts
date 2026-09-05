import type { ChatMessageDTO } from "../../common/model/ChatMessageDTO.js";

export interface LegacyPreparedMessages {
  readonly modelMessages: readonly ChatMessageDTO[];
  readonly userQuery: string;
  readonly memoryEnabled: boolean;
}
