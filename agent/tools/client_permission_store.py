from __future__ import annotations

import json
import logging
from pathlib import Path

from tools.tool_permission import PermissionConfig, ToolMode, ToolPermission

logger = logging.getLogger(__name__)


class ClientPermissionStore:
    """客户端权限持久化存储，基于 JSON 文件。

    用于本地客户端场景，持久化用户对各工具的 allow/ask/deny 偏好。
    服务端场景通常不需要此存储，直接使用 PermissionConfig 即可。
    """

    def __init__(self, path: str | Path) -> None:
        self._path = Path(path)
        self._cache: dict[str, str] = {}
        self._load()

    # ------------------------------------------------------------------
    # 公开 API
    # ------------------------------------------------------------------

    def get_mode(self, tool_name: str) -> ToolMode | None:
        """获取指定工具的权限模式，未配置时返回 None。"""
        return self._cache.get(tool_name)  # type: ignore[return-value]

    def set_mode(self, tool_name: str, mode: ToolMode) -> None:
        """设置指定工具的权限模式并持久化。"""
        self._cache[tool_name] = mode
        self._save()

    def remove(self, tool_name: str) -> bool:
        """移除指定工具的权限配置并持久化。"""
        if tool_name not in self._cache:
            return False
        del self._cache[tool_name]
        self._save()
        return True

    def list_all(self) -> dict[str, ToolMode]:
        """返回所有已配置的工具权限。"""
        return dict(self._cache)  # type: ignore[arg-type]

    def to_permission_config(
        self,
        *,
        default_mode: ToolMode = "ask",
        read_resources: set[str] | None = None,
        write_resources: set[str] | None = None,
    ) -> PermissionConfig:
        """将存储内容转换为 PermissionConfig 实例。"""
        tool_modes: dict[ToolPermission, ToolMode] = {}
        for name, mode in self._cache.items():
            try:
                perm = ToolPermission(name)
                tool_modes[perm] = mode
            except ValueError:
                logger.warning("Unknown tool permission '%s', skipping", name)
        kwargs: dict = {
            "tool_modes": tool_modes,
            "default_mode": default_mode,
        }
        if read_resources is not None:
            kwargs["read_resources"] = read_resources
        if write_resources is not None:
            kwargs["write_resources"] = write_resources
        return PermissionConfig(**kwargs)

    # ------------------------------------------------------------------
    # 内部实现
    # ------------------------------------------------------------------

    def _load(self) -> None:
        if not self._path.exists():
            self._cache = {}
            return
        try:
            data = json.loads(self._path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                self._cache = {str(k): str(v) for k, v in data.items()}
            else:
                self._cache = {}
        except Exception:
            logger.warning("Failed to load permission store from %s, using defaults", self._path)
            self._cache = {}

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps(self._cache, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
