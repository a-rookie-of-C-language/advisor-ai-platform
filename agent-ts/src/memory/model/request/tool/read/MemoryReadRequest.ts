export interface MemoryReadRequest {
  userId: number;
  kbId: number;
  query: string;
  topK: number;
}
