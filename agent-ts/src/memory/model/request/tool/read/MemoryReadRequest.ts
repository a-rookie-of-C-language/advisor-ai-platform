export interface MemoryReadRequest {
  userId: number;
  knowledgeBaseId: number;
  query: string;
  topK: number;
}
