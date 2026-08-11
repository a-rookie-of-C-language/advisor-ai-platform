from __future__ import annotations

import asyncio
import logging
from types import SimpleNamespace

import pytest

from tools.mcp.client.mcp_client_pool import McpClientPool
from tools.mcp.client.McpConnection import McpConnection
from tools.mcp.config.mcp_config_parser import parse_stdio_env
from tools.mcp.config.McpServerConfig import McpServerConfig
from tools.mcp.direct.DirectMcpCallToolResult import DirectMcpCallToolResult
from tools.mcp.direct.DirectMcpToolListResult import DirectMcpToolListResult


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


def test_parse_stdio_env_reads_key_value_pairs(monkeypatch):
    monkeypatch.setenv("MCP_STDIO_ENV", "A=1 B=hello C=value=with_equals ignored")

    assert parse_stdio_env() == {
        "A": "1",
        "B": "hello",
        "C": "value=with_equals",
    }


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


@pytest.mark.asyncio
async def test_cleanup_idle_uses_event_loop_time():
    pool = McpClientPool()
    config = McpServerConfig(name="local", transport_type="stdio", url_or_command="python server.py")
    conn = McpConnection(config=config)
    conn.client = SimpleNamespace(close=lambda: None)
    conn.last_used = asyncio.get_event_loop().time()
    pool._connections["local"] = conn

    await pool.cleanup_idle()

    assert "local" in pool._connections


def test_close_connection_logs_sync_close_failure(caplog):
    pool = McpClientPool()
    config = McpServerConfig(name="local", transport_type="stdio", url_or_command="python server.py")
    conn = McpConnection(config=config)

    def close():
        raise RuntimeError("sync close failed")

    conn.client = SimpleNamespace(close=close)
    pool._connections["local"] = conn

    with caplog.at_level(logging.DEBUG, logger="tools.mcp.client.mcp_client_pool"):
        pool._close_connection("local")

    assert "local" not in pool._connections
    assert "sync close failed" in caplog.text


@pytest.mark.asyncio
async def test_close_connection_logs_async_close_failure(caplog):
    pool = McpClientPool()
    config = McpServerConfig(name="local", transport_type="stdio", url_or_command="python server.py")
    conn = McpConnection(config=config)

    async def close():
        raise RuntimeError("async close failed")

    conn.client = SimpleNamespace(close=close)
    pool._connections["local"] = conn

    with caplog.at_level(logging.DEBUG, logger="tools.mcp.client.mcp_client_pool"):
        pool._close_connection("local")
        await asyncio.sleep(0)

    assert "local" not in pool._connections
    assert "async close failed" in caplog.text
