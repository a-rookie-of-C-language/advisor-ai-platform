import type { JsonRpcResponse } from "../jsonRpc/JsonRpcResponse.js";
import { DirectHttpMcpResponseValidator } from "./DirectHttpMcpResponseValidator.js";

export class DirectHttpMcpResponseReader {
  private readonly responseValidator = new DirectHttpMcpResponseValidator();

  async read(response: Response): Promise<JsonRpcResponse> {
    this.responseValidator.validateHttp(response);
    const data = (await response.json()) as JsonRpcResponse;
    this.responseValidator.validateJsonRpc(data);
    return data;
  }
}
