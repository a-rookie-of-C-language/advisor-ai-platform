import type { JsonRpcResponse } from "../../../jsonRpc/model/JsonRpcResponse.js";
import { DirectHttpMcpResponseValidator } from "../validation/DirectHttpMcpResponseValidator.js";

export class DirectHttpMcpResponseReader {
  private readonly responseValidator = new DirectHttpMcpResponseValidator();

  async read(response: Response): Promise<JsonRpcResponse> {
    this.responseValidator.validateHttp(response);
    const data = (await response.json()) as JsonRpcResponse;
    this.responseValidator.validateJsonRpc(data);
    return data;
  }
}
