from __future__ import annotations

import logging
import os

from tools.mcp.config.McpServerConfig import McpServerConfig

logger = logging.getLogger(__name__)


def parse_mcp_server_configs(servers_str: str | None = None) -> list[McpServerConfig]:
    raw_servers = os.getenv("MCP_SERVERS", "").strip() if servers_str is None else servers_str.strip()
    if not raw_servers:
        return []

    configs: list[McpServerConfig] = []
    for server_entry in raw_servers.split(","):
        server_entry = server_entry.strip()
        if not server_entry:
            continue

        parts = server_entry.split(":")
        if len(parts) < 3:
            logger.warning("Invalid MCP server config (skip): %s", server_entry)
            continue

        name, transport_type, url_or_command = parts[0], parts[1], ":".join(parts[2:])
        token_key = f"MCP_TOKEN_{name.upper().replace('-', '_')}"
        configs.append(
            McpServerConfig(
                name=name,
                transport_type=transport_type,
                url_or_command=url_or_command,
                token=os.getenv(token_key),
            )
        )

    return configs


def parse_stdio_env(env_str: str | None = None) -> dict[str, str] | None:
    raw_env = os.getenv("MCP_STDIO_ENV", "") if env_str is None else env_str
    if not raw_env:
        return None

    stdio_env: dict[str, str] = {}
    for item in raw_env.split():
        if "=" in item:
            key, value = item.split("=", 1)
            stdio_env[key] = value
    return stdio_env or None
