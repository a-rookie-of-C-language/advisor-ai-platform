import type { OpenAiToolExecutionResult } from "../../../openai/tools/runtime/model/result/OpenAiToolExecutionResult.js";
import type { RagDocument } from "../../context/model/RagDocument.js";

export class RagSearchToolResultFactory {
  create(matchedDocuments: RagDocument[]): OpenAiToolExecutionResult {
    return {
      output: JSON.stringify({
        ok: matchedDocuments.length > 0,
        status: matchedDocuments.length > 0 ? "hit" : "miss",
        message: matchedDocuments.length > 0 ? "hit" : "miss",
        items: matchedDocuments.map((document) => ({
          id: document.id,
          docName: document.fileName,
          fileType: document.fileType || "",
          fileSize: document.fileSize || 0,
          status: document.status || "",
          snippet: document.fileName
        }))
      }),
      success: true
    };
  }
}
