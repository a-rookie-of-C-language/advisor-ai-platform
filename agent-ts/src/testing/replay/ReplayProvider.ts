import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { OpenAIChatStreamEvent } from "../../protocol/events/model/openai/OpenAIChatStreamEvent.js";
import type { AgentStreamFn } from "../../app/loop/model/AgentLoopOptions.js";

export type ReplayTurn = {
  expectedMessages: ChatStreamRequest["messages"];
  events: OpenAIChatStreamEvent[];
};

export class ReplayProvider {
  private readonly turns: ReplayTurn[];
  private nextTurn = 0;

  constructor(turns: ReplayTurn[]) {
    this.turns = structuredClone(turns);
  }

  readonly stream: AgentStreamFn = this.streamReplay.bind(this);

  private async *streamReplay(messages: ChatStreamRequest["messages"], signal?: AbortSignal): AsyncGenerator<OpenAIChatStreamEvent> {
    const turn = this.turns[this.nextTurn++];
    if (!turn) {
      throw new Error("Replay exhausted: no fixture turn matches the request");
    }
    if (JSON.stringify(messages) !== JSON.stringify(turn.expectedMessages)) {
      throw new Error(`Replay request mismatch at turn ${this.nextTurn}`);
    }
    for (const event of turn.events) {
      if (signal?.aborted) {
        throw new Error("Replay stream aborted");
      }
      yield structuredClone(event);
    }
  }

  assertConsumed(): void {
    if (this.nextTurn !== this.turns.length) {
      throw new Error(`Replay incomplete: consumed ${this.nextTurn}/${this.turns.length} turns`);
    }
  }
}
