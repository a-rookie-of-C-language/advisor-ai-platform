import type { AttachmentDTO } from "../ChatStreamRequest.js";

export class ChatStreamRequestFieldReader {
  readOptionalAttachments(value: unknown): AttachmentDTO[] | null {
    return Array.isArray(value) ? value : null;
  }

  readOptionalNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  readOptionalString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }
}
