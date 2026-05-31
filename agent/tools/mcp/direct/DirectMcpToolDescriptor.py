from __future__ import annotations

from json_types import JsonObject


class DirectMcpToolDescriptor:
    def __init__(self, data: JsonObject) -> None:
        self.name = str(data.get("name", "") or "")
        self.description = str(data.get("description", "") or "")
        input_schema = data.get("inputSchema", {})
        self.inputSchema = input_schema if isinstance(input_schema, dict) else {}
        self.annotations = None
        self._meta = None
