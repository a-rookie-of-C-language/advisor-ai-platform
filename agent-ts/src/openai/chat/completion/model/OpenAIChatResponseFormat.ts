import type { OpenAIChatJsonSchema } from "./OpenAIChatJsonSchema.js";

export type OpenAIChatResponseFormat =
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: OpenAIChatJsonSchema };
