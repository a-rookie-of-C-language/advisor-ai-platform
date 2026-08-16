import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import { RegexSafetyFilter } from "../regex/RegexSafetyFilter.js";

export class InputSafetySanitizer {
  constructor(private readonly filter = new RegexSafetyFilter()) {}

  sanitize(request: ChatStreamRequest): ChatStreamRequest {
    return {
      ...request,
      messages: request.messages.map((message) => ({
        ...message,
        content: this.filter.redact(message.content)
      }))
    };
  }
}
