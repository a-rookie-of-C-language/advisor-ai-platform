import { spawn } from "node:child_process";

export class AgentCoreProcessRunner {
  constructor(private readonly executablePath: string) {}

  run(command: string, input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.executablePath, [command], {
        stdio: ["pipe", "pipe", "pipe"]
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve(Buffer.concat(stdout).toString("utf8"));
          return;
        }
        reject(new Error(Buffer.concat(stderr).toString("utf8") || `agent-core exited with ${code}`));
      });

      child.stdin.end(input);
    });
  }
}
