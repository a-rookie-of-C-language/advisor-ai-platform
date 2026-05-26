from __future__ import annotations

from pathlib import Path

from tools.workspace.BinaryFileError import BinaryFileError
from tools.workspace.DepthLimitError import DepthLimitError
from tools.workspace.FileCountLimitError import FileCountLimitError
from tools.workspace.PathTraversalError import PathTraversalError
from tools.workspace.workspace_limits import (
    BINARY_EXTENSIONS,
    FINAL_DIR,
    MAX_DEPTH,
    MAX_FILES_PER_SESSION,
)


class WorkspacePathGuard:
    def __init__(self, base_path: Path) -> None:
        self._base_path = base_path

    def get_session_path(self, user_id: int | None, session_id: int | None) -> Path:
        user_id = user_id or 0
        session_id = session_id or 0
        return self._base_path / str(user_id) / str(session_id)

    def validate_path(self, user_id: int | None, session_id: int | None, relative_path: str) -> Path:
        session_path = self.get_session_path(user_id, session_id)
        try:
            target = (session_path / relative_path).resolve()
            target.relative_to(session_path)
        except ValueError:
            raise PathTraversalError(f"路径穿越尝试: {relative_path}") from None

        if target.suffix.lower() in BINARY_EXTENSIONS:
            raise BinaryFileError(f"不支持操作二进制文件: {target.suffix}")

        return target

    def ensure_session_path(self, user_id: int | None, session_id: int | None) -> Path:
        session_path = self.get_session_path(user_id, session_id)
        session_path.mkdir(parents=True, exist_ok=True)
        return session_path

    def final_path(self, session_path: Path, relative_path: str) -> Path:
        return session_path / FINAL_DIR / relative_path

    def check_depth(self, user_id: int | None, session_id: int | None, path: Path) -> None:
        try:
            session_path = self.get_session_path(user_id, session_id)
            rel = path.relative_to(session_path)
            if len(rel.parts) > MAX_DEPTH:
                raise DepthLimitError(f"目录深度超限（最大 {MAX_DEPTH} 层）: {rel}")
        except ValueError:
            pass

    def check_file_limit(self, session_path: Path) -> None:
        count = self._count_files(session_path)
        if count >= MAX_FILES_PER_SESSION:
            raise FileCountLimitError(f"文件数量超限（最大 {MAX_FILES_PER_SESSION} 个）")

    def _count_files(self, session_path: Path) -> int:
        count = 0
        if not session_path.exists():
            return 0
        for item in session_path.rglob("*"):
            if item.is_file():
                parts = item.parts
                if ".cache" not in parts and "final" not in parts:
                    count += 1
        return count
