import type { RagDocument } from "./RagDocument.js";

export class RagPromptRenderer {
  render(kbId: number, documents: RagDocument[]): string {
    const readyDocuments = documents.filter((document) => document.status === "READY" || document.status === "INDEXED");
    if (readyDocuments.length === 0) {
      return "";
    }
    const renderedDocuments = readyDocuments
      .slice(0, 10)
      .map((document, index) => `${index + 1}. ${document.fileName} (${document.fileType || "unknown"}, ${document.fileSize || 0} bytes)`)
      .join("\n");
    return `Knowledge base id: ${kbId}\nAvailable documents:\n${renderedDocuments}`;
  }
}
