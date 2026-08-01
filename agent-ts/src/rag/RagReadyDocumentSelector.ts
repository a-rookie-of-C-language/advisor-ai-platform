import type { RagDocument } from "./RagDocument.js";

export class RagReadyDocumentSelector {
  select(documents: RagDocument[]): RagDocument[] {
    return documents.filter((document) => document.status === "READY" || document.status === "INDEXED");
  }
}
