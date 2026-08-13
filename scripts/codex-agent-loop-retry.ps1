# Codex auto-retry script: retry until upstream /v1/responses recovers
$ErrorActionPreference = 'Continue'
$logFile = 'D:\code\advisor-ai-platform\.codex-retry.log'
$maxAttempts = 120
$attempt = 0

$prompt = @'
Please implement the AgentLoop refactor for agent-ts strictly following docs/agent-loop-pi-refactor-plan.md.

Background: current branch is refactor/agent-loop-pi, created from feat/agent-ts-rust-runtime. Plan doc: docs/agent-loop-pi-refactor-plan.md.

Tasks:
1. Create agent-ts/src/app/loop/model/AgentLoopOptions.ts (types: AgentLoopToolCall, AgentLoopToolResult, AgentBeforeToolCallContext, AgentAfterToolCallContext, AgentStreamFn, AgentLoopOptions with maxTurns and signal)
2. Create agent-ts/src/app/loop/core/AgentLoop.ts (Pi-style unified loop: transformContext before each turn to trim/inject/filter; call stream to collect delta/tool_call; beforeToolCall returning false blocks execution and generates error result; afterToolCall can rewrite result; append tool results into conversation then next turn; stop when maxTurns reached or no tool calls; emit agent_start/turn_start/turn_end/agent_end lifecycle events via onEvent callback)
3. Create agent-ts/src/app/loop/factory/AgentLoopFactory.ts (assemble: Rust stream AgentCoreClient + TS fallback OpenAIChatClient + tool execution AgentOpenAiToolFacade + AgentContextPipeline; Rust stream first, fallback to TS stream on failure)
4. Modify agent-ts/src/app/session/core/stream/AgentChatStreamSession.ts: remove hand-written two-round loop, use AgentLoop unified loop; keep memoryTaskCompletionSubmitter submit
5. Modify agent-ts/src/app/session/core/pipeline/AgentContextPipeline.ts: keep existing build() for compatibility, add transform(messages, signal) per-turn method
6. Keep existing SSE event format (delta/tool_call/tool_result/done) unchanged, Rust agent-core protocol unchanged, frontend untouched

Hard constraints (agents.md rules):
- One class per file, filename equals class name
- Do not modify code unrelated to the plan
- TypeScript strict mode, types must be correct
- After finishing, run npm run check in agent-ts directory, ensure tsc --noEmit passes
- Run npm run build to ensure compilation passes
- Commit with git, message: refactor: 抽取统一 AgentLoop 循环（借鉴 Pi 设计）

Workdir: D:\code\advisor-ai-platform
Code dir: agent-ts\src
'@

Add-Content -Path $logFile -Value "=== codex retry script started $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" -Encoding UTF8

while ($attempt -lt $maxAttempts) {
    $attempt++
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "--- attempt $attempt/$maxAttempts @ $ts ---" -Encoding UTF8
    $out = codex exec -s workspace-write -m "gpt-5.5" $prompt 2>&1 | Out-String
    Add-Content -Path $logFile -Value $out -Encoding UTF8
    if ($out -notmatch 'ERROR: unexpected status|502 Bad Gateway|503 Service Unavailable|429') {
        Add-Content -Path $logFile -Value "SUCCESS: codex finished @ $ts" -Encoding UTF8
        break
    }
    Add-Content -Path $logFile -Value "upstream issue, retrying in 60s..." -Encoding UTF8
    Start-Sleep -Seconds 60
}

if ($attempt -ge $maxAttempts) {
    Add-Content -Path $logFile -Value "FAILED: max attempts $maxAttempts reached, giving up" -Encoding UTF8
}
