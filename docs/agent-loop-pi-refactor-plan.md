# agent-ts 借鉴 Pi 的 AgentLoop 改造方案

## 目标

将 `AgentChatStreamSession` 中"手写两轮循环"（第一轮 LLM → 工具 → 第二轮 LLM）抽取为统一 AgentLoop，对齐 Pi 的三大设计：

1. **统一 Agent Loop**：支持多轮工具调用、停止条件、并行工具执行
2. **每轮上下文转换**：`transformContext` + `convertToLlm` 分离内部消息与模型消息
3. **Agent 生命周期事件**：`agent_start / turn_start / tool_execution_start / tool_execution_end / turn_end / agent_end`

保持现有 SSE 协议（delta / tool_call / tool_result / done）与 Rust agent-core 兼容，不破坏后端/前端接口。

## 现有代码结构（已确认）

- `agent-ts/src/app/session/core/stream/AgentChatStreamSession.ts` — 手写两轮循环的会话类
- `agent-ts/src/app/session/core/pipeline/AgentContextPipeline.ts` — 一次性上下文注入（Memory/RAG/WebFetch/WebSearch）
- `agent-ts/src/openai/tools/runtime/core/runner/OpenAIToolRoundRunner.ts` — 顺序工具执行器
- `agent-ts/src/openai/tools/runtime/state/conversation/OpenAIToolConversationAppender.ts` — 会话追加器
- `agent-ts/src/core/client/AgentCoreClient.ts` — Rust 核心客户端（streamChat 返回 AsyncGenerator）
- `agent-ts/src/protocol/events/model/openai/OpenAIChatStreamEvent.ts` — SSE 事件类型
- `agent-ts/src/protocol/events/stream/writer/AgentStreamEventWriter.ts` — SSE 写入器
- `agent-ts/src/openai/chat/core/client/OpenAIChatClient.ts` — TS 兜底客户端
- `agent-ts/src/app/openAi/core/AgentOpenAiToolFacade.ts` — 工具列表/执行门面

## 新增文件

### 1. `agent-ts/src/app/loop/model/AgentLoopOptions.ts`

```ts
import type { JsonObject } from "../../../common/json/types/JsonTypes.js";
import type { AgentCoreStreamEvent } from "../../../core/model/AgentCoreStreamEvent.js";
import type { OpenAIChatMessage } from "../../../openai/chat/model/message/OpenAIChatMessage.js";

export interface AgentLoopToolCall {
  id: string;
  name: string;
  args: JsonObject;
}

export interface AgentLoopToolResult {
  toolCallId: string;
  toolName: string;
  output: string;
  success: boolean;
}

export interface AgentBeforeToolCallContext {
  toolCall: AgentLoopToolCall;
  signal?: AbortSignal;
}

export interface AgentAfterToolCallContext {
  toolCall: AgentLoopToolCall;
  result: AgentLoopToolResult;
  signal?: AbortSignal;
}

export type AgentStreamFn = (
  messages: OpenAIChatMessage[],
  signal?: AbortSignal
) => AsyncGenerator<AgentCoreStreamEvent>;

export interface AgentLoopOptions {
  stream: AgentStreamFn;
  executeTool: (toolCall: AgentLoopToolCall, signal?: AbortSignal) => Promise<AgentLoopToolResult>;
  transformContext?: (messages: OpenAIChatMessage[], signal?: AbortSignal) => Promise<OpenAIChatMessage[]>;
  beforeToolCall?: (context: AgentBeforeToolCallContext) => Promise<boolean | void>;
  afterToolCall?: (context: AgentAfterToolCallContext) => Promise<AgentLoopToolResult | void>;
  maxTurns?: number;
  signal?: AbortSignal;
}
```

### 2. `agent-ts/src/app/loop/core/AgentLoop.ts`

Pi 风格统一循环核心。职责：

- 每轮开始前调用 `transformContext`（可裁剪/注入/过滤）
- 调用 `stream` 获取 delta / tool_call
- 收集 tool_calls，逐个（或并行）执行：
  - `beforeToolCall` 返回 false 时阻止执行，生成错误结果
  - `afterToolCall` 可改写结果
- 工具结果 append 进 conversation 后进入下一轮
- `maxTurns` 到达或没有 tool_call 时结束
- 事件通过回调（`onEvent`）发出：agent_start / turn_start / turn_end / agent_end

### 3. `agent-ts/src/app/loop/factory/AgentLoopFactory.ts`

组装 AgentLoop 的依赖：

- 接收 `AgentCoreClient`（Rust 流）+ `OpenAIChatClient`（TS 兜底流）
- 接收 `AgentOpenAiToolFacade`（工具执行）
- 接收 `AgentContextPipeline`（每轮 transformContext 适配）
- 提供 `create(chatRequest, tools)` 返回可用的 AgentLoop

## 修改文件

### 1. `AgentChatStreamSession.ts`（核心改造）

- 删除手写 `streamWithRust` / `streamWithTypescript` 中的两轮循环逻辑
- 改为：构建 conversation → 用 AgentLoop 跑统一循环 → 事件写入 writer
- Rust 流优先，失败回退 TS 流（保留现有 fallback 逻辑）
- 保留 memoryTaskCompletionSubmitter 提交

### 2. `AgentContextPipeline.ts`（适配每轮转换）

- 保留现有 `build()` 一次性注入（向后兼容）
- 新增 `transform(messages, signal)` 方法，对齐 Pi 的 `transformContext` 语义

### 3. `OpenAIToolRoundRunner.ts`（可选并行化）

- 保留顺序模式（默认）
- 增加并行执行支持（对齐 Pi 默认 `parallel`）

## 事件协议扩展

在现有 `ProtocolEvent`（event/source/traceId/payload）基础上，AgentLoop 内部通过回调发出生命周期事件，`AgentStreamEventWriter` 保持现有 SSE 输出（delta/tool_call/tool_result/done）不变，前端无需改动。

## 兼容性保证

- Rust agent-core 协议不变（stdin JSONL: url/api_key/model/messages/tools → delta/tool_call/done）
- SSE 事件格式不变（前端消费不变）
- chat-service 调用 `/chat/stream` 的请求/响应不变
- agents.md 规范：每个类一个文件、DAO 约束、格式检查、中文 commit

## 验收标准

1. `npm run check` 通过（TypeScript 类型检查）
2. `npm run test:integration` 通过（如可运行）
3. `chat_e2e_drill.mjs smoke` 联调通过（需环境）
4. 多轮工具调用场景：模型连续调用 2+ 次工具时循环正确
5. 现有单轮流式聊天行为不变
