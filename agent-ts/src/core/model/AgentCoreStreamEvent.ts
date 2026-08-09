export type AgentCoreStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      finish_reason: string | null;
    };
