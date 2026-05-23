from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Literal

# 二进制文件扩展名
BINARY_EXTENSIONS = {
    ".exe", ".dll", ".so", ".bin", ".a", ".o",
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
    ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z", ".bz2",
    ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
}

# 常量配置
MAX_FILE_SIZE = 1048576  # 1MB
MAX_DEPTH = 5
MAX_FILES_PER_SESSION = 50
CACHE_DIR = ".cache"
FINAL_DIR = "final"
OPERATION_TIMEOUT = 10.0  # 秒


class WorkspaceError(Exception):
    """Workspace 操作错误基类"""
    pass


class PathTraversalError(WorkspaceError):
    """路径穿越尝试"""
    pass


class BinaryFileError(WorkspaceError):
    """尝试操作二进制文件"""
    pass


class FileSizeLimitError(WorkspaceError):
    """文件大小超限"""
    pass


class DepthLimitError(WorkspaceError):
    """目录深度超限"""
    pass


class FileCountLimitError(WorkspaceError):
    """文件数量超限"""
    pass


class WorkspaceManager:
    """Workspace 核心管理类"""

    def __init__(self, base_path: str | None = None) -> None:
        if base_path is None:
            base_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "workspace")
        self._base_path = Path(base_path).resolve()

    def _get_session_path(self, user_id: int | None, session_id: int | None) -> Path:
        """获取用户 session 的 workspace 路径"""
        user_id = user_id or 0
        session_id = session_id or 0
        return self._base_path / str(user_id) / str(session_id)

    def _validate_path(self, user_id: int | None, session_id: int | None, relative_path: str) -> Path:
        """验证路径安全性，返回绝对路径"""
        session_path = self._get_session_path(user_id, session_id)
        try:
            target = (session_path / relative_path).resolve()
            # 检查是否在 session_path 下
            target.relative_to(session_path)
        except ValueError:
            raise PathTraversalError(f"路径穿越尝试: {relative_path}")

        # 检查二进制文件
        if target.suffix.lower() in BINARY_EXTENSIONS:
            raise BinaryFileError(f"不支持操作二进制文件: {target.suffix}")

        return target

    def _ensure_session_path(self, user_id: int | None, session_id: int | None) -> Path:
        """确保 session 路径存在"""
        session_path = self._get_session_path(user_id, session_id)
        session_path.mkdir(parents=True, exist_ok=True)
        return session_path

    def _check_depth(self, path: Path) -> None:
        """检查目录深度"""
        try:
            session_path = self._get_session_path(None, None)
            rel = path.relative_to(session_path)
            if len(rel.parts) > MAX_DEPTH:
                raise DepthLimitError(f"目录深度超限（最大 {MAX_DEPTH} 层）: {rel}")
        except ValueError:
            pass

    def _count_files(self, session_path: Path) -> int:
        """统计文件数量（不计入 .cache 和 final 目录）"""
        count = 0
        if not session_path.exists():
            return 0
        for item in session_path.rglob("*"):
            if item.is_file():
                # 排除 .cache 和 final 目录
                parts = item.parts
                if ".cache" not in parts and "final" not in parts:
                    count += 1
        return count

    def _check_file_limit(self, session_path: Path) -> None:
        """检查文件数量限制"""
        count = self._count_files(session_path)
        if count >= MAX_FILES_PER_SESSION:
            raise FileCountLimitError(f"文件数量超限（最大 {MAX_FILES_PER_SESSION} 个）")

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

        with open(path, "r", encoding="utf-8") as f:
            f.seek(offset)
            return f.read(limit)

    def write(self, user_id: int | None, session_id: int | None, relative_path: str, content: str, is_final: bool = False) -> dict:
        """写入文件内容"""
        session_path = self._ensure_session_path(user_id, session_id)
        path = self._validate_path(user_id, session_id, relative_path)

        self._check_depth(path)

        # 检查文件内容大小
        content_bytes = content.encode("utf-8")
        if len(content_bytes) > MAX_FILE_SIZE:
            raise FileSizeLimitError(f"内容过大（最大 {MAX_FILE_SIZE} 字节）")

        self._check_file_limit(session_path)

        # 确保父目录存在
        path.parent.mkdir(parents=True, exist_ok=True)

        if is_final:
            # 写入 final 目录
            final_path = session_path / FINAL_DIR / relative_path
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
            final_path = self._get_session_path(user_id, session_id) / FINAL_DIR / relative_path
            final_path.parent.mkdir(parents=True, exist_ok=True)
            with open(final_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            return {"path": str(final_path.relative_to(self._get_session_path(user_id, session_id))), "replaced": True}
        else:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            return {"path": relative_path, "replaced": True}

    def list(self, user_id: int | None, session_id: int | None, relative_path: str = ".", recursive: bool = False) -> list[dict]:
        """列出目录内容"""
        session_path = self._ensure_session_path(user_id, session_id)
        path = self._validate_path(user_id, session_id, relative_path)

        if not path.exists():
            return []

        if not path.is_dir():
            return [{"name": path.name, "type": "file", "size": path.stat().st_size}]

        results = []
        if recursive:
            for item in path.rglob("*"):
                if item.is_file():
                    rel = item.relative_to(path)
                    results.append({
                        "name": str(rel),
                        "type": "file",
                        "size": item.stat().st_size,
                    })
                elif item.is_dir() and ".cache" not in item.parts:
                    rel = item.relative_to(path)
                    results.append({
                        "name": str(rel),
                        "type": "dir",
                    })
        else:
            for item in sorted(path.iterdir()):
                if item.name == ".cache":
                    continue
                if item.is_file():
                    results.append({
                        "name": item.name,
                        "type": "file",
                        "size": item.stat().st_size,
                    })
                elif item.is_dir():
                    results.append({
                        "name": item.name,
                        "type": "dir",
                    })

        return results

    def create_dir(self, user_id: int | None, session_id: int | None, relative_path: str, is_final: bool = False) -> dict:
        """创建目录"""
        session_path = self._ensure_session_path(user_id, session_id)
        path = self._validate_path(user_id, session_id, relative_path)

        self._check_depth(path)

        if is_final:
            final_path = session_path / FINAL_DIR / relative_path
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

        total_files = 0
        total_size = 0
        cache_files = 0
        cache_size = 0
        final_files = 0
        final_size = 0

        if session_path.exists():
            for item in session_path.rglob("*"):
                if item.is_file():
                    size = item.stat().st_size
                    parts = item.parts
                    if ".cache" in parts:
                        cache_files += 1
                        cache_size += size
                    elif "final" in parts:
                        final_files += 1
                        final_size += size
                    else:
                        total_files += 1
                        total_size += size

        return {
            "user_id": user_id,
            "session_id": session_id,
            "total_files": total_files,
            "total_size": total_size,
            "cache_files": cache_files,
            "cache_size": cache_size,
            "final_files": final_files,
            "final_size": final_size,
            "cache_dir": str(session_path / CACHE_DIR),
            "final_dir": str(session_path / FINAL_DIR),
        }