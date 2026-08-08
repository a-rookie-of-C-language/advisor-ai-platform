import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class AgentCoreExecutableLocator {
  findDefaultExecutable(): string | undefined {
    const currentFile = fileURLToPath(import.meta.url);
    const repoRoot = path.resolve(path.dirname(currentFile), "..", "..", "..");
    const candidates = [
      path.join(repoRoot, "agent-core", "target", "release", this.binaryName()),
      path.join(repoRoot, "agent-core", "target", "debug", this.binaryName())
    ];
    return candidates.find((candidate) => existsSync(candidate));
  }

  private binaryName(): string {
    return process.platform === "win32" ? "agent-core.exe" : "agent-core";
  }
}
