export class BooleanStringReader {
  static readTruthy(value: string, truthyValues: string[]): boolean {
    return truthyValues.includes(value.toLowerCase());
  }
}
