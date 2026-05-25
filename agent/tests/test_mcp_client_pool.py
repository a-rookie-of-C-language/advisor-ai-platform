from __future__ import annotations

from types import SimpleNamespace

from tools.DirectMcpCallToolResult import DirectMcpCallToolResult
from tools.DirectMcpToolListResult import DirectMcpToolListResult
from tools.McpServerConfig import McpServerConfig
from tools.mcp_client_pool import McpClientPool


def test_parse_env_config_reads_servers_and_token(monkeypatch):
    monkeypatch.setenv(
        "MCP_SERVERS",
        "student-service:http:http://localhost:8080/mcp,local:stdio:python server.py",
    )
    monkeypatch.setenv("MCP_TOKEN_STUDENT_SERVICE", "student-token")

    configs = McpClientPool.parse_env_config()

    assert configs == [
        McpServerConfig(
            name="student-service",
            transport_type="http",
            url_or_command="http://localhost:8080/mcp",
            token="student-token",
        ),
        McpServerConfig(
            name="local",
            transport_type="stdio",
            url_or_command="python server.py",
            token=None,
        ),
    ]


def test_direct_mcp_tool_list_result_exposes_tool_descriptors():
    result = DirectMcpToolListResult(
        [
            {
                "name": "list_students",
                "description": "List students",
                "inputSchema": {"type": "object"},
            }
        ]
    )

    assert result.tools[0].name == "list_students"
    assert result.tools[0].description == "List students"
    assert result.tools[0].inputSchema == {"type": "object"}


def test_pool_parse_tool_result_keeps_text_content():
    pool = McpClientPool()
    result = DirectMcpCallToolResult([{"text": "ok"}])

    payload = pool._parse_tool_result(result)

    assert payload == {
        "ok": True,
        "content": [{"type": "text", "text": "ok"}],
        "isError": False,
    }


def test_pool_parse_tool_result_keeps_data_content():
    pool = McpClientPool()
    result = SimpleNamespace(
        content=[SimpleNamespace(data={"value": 1})],
        isError=False,
    )

    payload = pool._parse_tool_result(result)

    assert payload == {
        "ok": True,
        "content": [{"type": "text", "text": {"value": 1}}],
        "isError": False,
    }
