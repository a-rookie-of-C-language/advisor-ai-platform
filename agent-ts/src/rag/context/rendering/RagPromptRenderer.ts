import type { RagDocument } from "../model/RagDocument.js";
import { RagReadyDocumentSelector } from "../selection/RagReadyDocumentSelector.js";
import { RagDocumentListRenderer } from "./RagDocumentListRenderer.js";

export class RagPromptRenderer {
  private readonly documentListRenderer = new RagDocumentListRenderer();
  private readonly readyDocumentSelector = new RagReadyDocumentSelector();

  render(kbId: number, documents: RagDocument[]): string {
    const readyDocuments = this.readyDocumentSelector.select(documents);
    if (readyDocuments.length === 0) {
      return "";
    }
    const renderedDocuments = this.documentListRenderer.render(readyDocuments);
    return `Knowledge base id: ${kbId}\nAvailable documents:\n${renderedDocuments}`;
  }
}
