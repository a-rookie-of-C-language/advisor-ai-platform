export class McpServerConfig {
  constructor(
    readonly name: string,
    readonly transportType: string,
    readonly urlOrCommand: string,
    readonly token: string | undefined
  ) {}
}
