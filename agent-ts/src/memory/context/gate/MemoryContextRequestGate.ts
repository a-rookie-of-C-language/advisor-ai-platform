export class MemoryContextRequestGate {
  shouldLoad(userId: number | null | undefined, sessionId: number | null | undefined, userQuery: string): boolean {
    return Boolean(userId && sessionId && userQuery);
  }
}
