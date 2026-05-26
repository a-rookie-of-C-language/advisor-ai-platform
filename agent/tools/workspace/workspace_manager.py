from __future__ import annotations

import os
from pathlib import Path

from tools.workspace.BinaryFileError import BinaryFileError
from tools.workspace.DepthLimitError import DepthLimitError
from tools.workspace.FileCountLimitError import FileCountLimitError
from tools.workspace.FileSizeLimitError import FileSizeLimitError
from tools.workspace.PathTraversalError import PathTraversalError
from tools.workspace.WorkspaceError import WorkspaceError
from tools.workspace.workspace_limits import (
    CACHE_DIR,
    MAX_FILE_SIZE,
    OPERATION_TIMEOUT,
)
from tools.workspace.workspace_listing import build_workspace_listing
from tools.workspace.workspace_path_guard import WorkspacePathGuard
from tools.workspace.workspace_stats import build_workspace_stats


class WorkspaceManager:
    """Workspace 核心管理类"""

    def __init__(self, base_path: str | None = None) -> None:
        if base_path is None:
            base_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "workspace")
        self._base_path = Path(base_path).resolve()
        self._path_guard = WorkspacePathGuard(self._base_path)

    def _get_session_path(self, user_id: int | None, session_id: int | None) -> Path:
        """获取用户 session 的 workspace 路径"""
        return self._path_guard.get_session_path(user_id, session_id)

    def _validate_path(self, user_id: int | None, session_id: int | None, relative_path: str) -> Path:
        """验证路径安全性，返回绝对路径"""
        return self._path_guard.validate_path(user_id, session_id, relative_path)

    def _ensure_session_path(self, user_id: int | None, session_id: int | None) -> Path:
        """确保 session 路径存在"""
        return self._path_guard.ensure_session_path(user_id, session_id)

    def _check_depth(self, user_id: int | None, session_id: int | None, path: Path) -> None:
        """检查目录深度"""
        self._path_guard.check_depth(user_id, session_id, path)

    def _check_file_limit(self, session_path: Path) -> None:
        """检查文件数量限制"""
        self._path_guard.check_file_limit(session_path)

    def read(self, user_id: int | None, session_id: int | None, relative_path: str, offset: int = 0, limit: int = 8192) -> str:
        """读取文件内容"""
        path = self._validate_path(user_id, session_id, relative_path)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"文件不存在: {relative_path}")

        # 检查文件大小
        file_size = path.stat().st_size
        if file_size > MAX_FILE_SIZE:
            raise FileSizeLimitError(f"文件过大（最大 {MAX_FILE_SIZE} 字节）: {file_size}")

        # 限制读取范围
        limit = min(limit, MAX_FILE_SIZE)

        data = path.read_bytes()
        return data[offset : offset + limit].decode("utf-8", errors="replace")

    def write(self, user_id: int | None, session_id: int | None, relative_path: str, content: str, is_final: bool = False) -> dict:
        """写入文件内容"""
        session_path = self._ensure_session_path(user_id, session_id)
        path = self._validate_path(user_id, session_id, relative_path)

        target_path = path if not is_final else self._path_guard.final_path(session_path, relative_path)
        self._check_depth(user_id, session_id, target_path)

        # 检查文件内容大小
        content_bytes = content.encode("utf-8")
        if len(content_bytes) > MAX_FILE_SIZE:
            raise FileSizeLimitError(f"内容过大（最大 {MAX_FILE_SIZE} 字节）")

        self._check_file_limit(session_path)

        # 确保父目录存在
        path.parent.mkdir(parents=True, exist_ok=True)

        if is_final:
            # 写入 final 目录
            final_path = self._path_guard.final_path(session_path, relative_path)
            final_path.parent.mkdir(parents=True, exist_ok=True)
            with open(final_path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"path": str(final_path.relative_to(session_path)), "size": len(content_bytes)}
        else:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"path": relative_path, "size": len(content_bytes)}

    def edit(self, user_id: int | None, session_id: int | None, relative_path: str, old_string: str, new_string: str, is_final: bool = False) -> dict:
        """编辑文件内容"""
        path = self._validate_path(user_id, session_id, relative_path)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"文件不存在: {relative_path}")

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        if old_string not in content:
            raise ValueError(f"未找到要替换的内容: {old_string[:50]}...")

        new_content = content.replace(old_string, new_string, 1)

        if is_final:
            session_path = self._get_session_path(user_id, session_id)
            final_path = self._path_guard.final_path(session_path, relative_path)
            final_path.parent.mkdir(parents=True, exist_ok=True)
            with open(final_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            return {"path": str(final_path.relative_to(session_path)), "replaced": True}
        else:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            return {"path": relative_path, "replaced": True}

    def list(self, user_id: int | None, session_id: int | None, relative_path: str = ".", recursive: bool = False) -> list[dict]:
        """列出目录内容"""
        session_path = self._ensure_session_path(user_id, session_id)
        path = self._validate_path(user_id, session_id, relative_path)

        return build_workspace_listing(path, recursive=recursive)

    def create_dir(self, user_id: int | None, session_id: int | None, relative_path: str, is_final: bool = False) -> dict:
        """创建目录"""
        session_path = self._ensure_session_path(user_id, session_id)
        path = self._validate_path(user_id, session_id, relative_path)

        target_path = path if not is_final else self._path_guard.final_path(session_path, relative_path)
        self._check_depth(user_id, session_id, target_path)

        if is_final:
            final_path = self._path_guard.final_path(session_path, relative_path)
            final_path.mkdir(parents=True, exist_ok=True)
            return {"path": str(final_path.relative_to(session_path)), "created": True}
        else:
            path.mkdir(parents=True, exist_ok=True)
            return {"path": relative_path, "created": True}

    def cleanup_cache(self, user_id: int | None, session_id: int | None) -> dict:
        """清理缓存目录"""
        session_path = self._get_session_path(user_id, session_id)
        cache_path = session_path / CACHE_DIR

        cleaned_files = 0
        cleaned_size = 0

        if cache_path.exists():
            for item in cache_path.rglob("*"):
                if item.is_file():
                    cleaned_size += item.stat().st_size
                    item.unlink()
                    cleaned_files += 1
            # 删除空目录
            for item in sorted(cache_path.rglob("*"), key=lambda x: len(x.parts), reverse=True):
                if item.is_dir() and not any(item.iterdir()):
                    item.rmdir()

        return {
            "cleaned_files": cleaned_files,
            "cleaned_size": cleaned_size,
        }

    def get_stats(self, user_id: int | None, session_id: int | None) -> dict:
        """获取 workspace 统计信息"""
        session_path = self._get_session_path(user_id, session_id)
        return build_workspace_stats(session_path, user_id, session_id)
