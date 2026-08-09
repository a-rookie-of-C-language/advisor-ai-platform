export class MemoryApiArrayResponseReader {
  read<T>(response: T[] | unknown): T[] {
    return Array.isArray(response) ? response : [];
  }
}
