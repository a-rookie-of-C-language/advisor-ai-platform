import asyncio
import os
import sys

sys.path.insert(0, "/app")
from tools.mcp.client.mcp_client_pool import McpClientPool, McpServerConfig


async def test():
    token = os.getenv("MCP_STUDENT_TOKEN", "").strip()
    if not token:
        raise RuntimeError("MCP_STUDENT_TOKEN is required")

    config = McpServerConfig(
        name="student",
        transport_type="http",
        url_or_command="http://advisor-student-service:8085/mcp/message",
        token=token,
    )
    pool = McpClientPool()
    try:
        result = await pool.call_tool(config, "get_student", {"student_id": 1})
        print("Result:", result)
    except Exception as e:
        import traceback

        traceback.print_exc()
        print("Error:", e)


asyncio.run(test())
