export interface MemoryTaskSubmitRequest {
  userId: number;
  kbId: number;
  sessionId: number;
  turnId: string;
  userText: string;
  assistantText: string;
  recentMessages: { role: string; content: string }[];
}
