export class MemoryApiEndpointFactory {
  longTermSearch(): string {
    return "/api/memory/long-term/search";
  }

  coreMemories(userId: number, kbId: number): string {
    const params = new URLSearchParams({ userId: String(userId), kbId: String(kbId) });
    return `/api/memory/long-term/core?${params}`;
  }

  sessionSummary(sessionId: number): string {
    return `/api/memory/session-summary/${sessionId}`;
  }

  longTermCandidates(): string {
    return "/api/memory/long-term/candidates";
  }

  memoryTaskSubmit(): string {
    return "/api/memory/task/submit";
  }
}
