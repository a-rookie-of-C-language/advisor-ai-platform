from __future__ import annotations

import pytest

from tools.workspace.workspace_manager import DepthLimitError, WorkspaceManager


def test_workspace_depth_limit_applies_to_real_session(tmp_path):
    manager = WorkspaceManager(str(tmp_path))

    with pytest.raises(DepthLimitError):
        manager.write(1, 2, "a/b/c/d/e/f.txt", "x")

    with pytest.raises(DepthLimitError):
        manager.write(1, 2, "a/b/c/d/e/f.txt", "x", is_final=True)


def test_workspace_read_handles_utf8_byte_offset(tmp_path):
    manager = WorkspaceManager(str(tmp_path))
    session_path = tmp_path / "1" / "2"
    session_path.mkdir(parents=True)
    (session_path / "note.txt").write_text("你好abc", encoding="utf-8")

    content = manager.read(1, 2, "note.txt", offset=1, limit=4)

    assert isinstance(content, str)
