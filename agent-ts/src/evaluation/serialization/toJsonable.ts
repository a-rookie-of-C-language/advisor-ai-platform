export function toJsonable<T>(value: T): T {
  return structuredClone(value);
}
