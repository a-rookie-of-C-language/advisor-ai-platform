import type { RagDocument } from "../../model/RagDocument.js";

export class RagDocumentListRenderer {
  render(documents: RagDocument[]): string {
    return documents
      .slice(0, 10)
      .map(
        (document, index) =>
          `${index + 1}. ${document.fileName} (${document.fileType || "unknown"}, ${document.fileSize || 0} bytes)`
      )
      .join("\n");
  }
}
