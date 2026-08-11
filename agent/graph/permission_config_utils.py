from __future__ import annotations

from dataclasses import asdict as dataclass_asdict

from json_types import JsonObject
from tools.permissions.tool_permission import PermissionConfig


def permission_config_to_json(permission_config: PermissionConfig) -> JsonObject:
    config_dict = dataclass_asdict(permission_config)
    tool_modes = config_dict.get("tool_modes", {})
    config_dict["tool_modes"] = {str(k.value): v for k, v in tool_modes.items()}
    read_resources = config_dict.get("read_resources", set())
    config_dict["read_resources"] = list(read_resources)
    write_resources = config_dict.get("write_resources", set())
    config_dict["write_resources"] = list(write_resources)
    return config_dict
