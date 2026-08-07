import type { ServerResponse } from "node:http";
import type { HttpRouteResult } from "../model/HttpRouteResult.js";
import type { AgentJsonResponseWriter } from "./AgentJsonResponseWriter.js";

export class AgentHttpRouteResultWriter {
  constructor(private readonly jsonResponseWriter: AgentJsonResponseWriter) {}

  writeIfPresent(response: ServerResponse, result: HttpRouteResult | null): boolean {
    if (!result) {
      return false;
    }
    this.jsonResponseWriter.write(response, result.statusCode, result.body);
    return true;
  }
}
