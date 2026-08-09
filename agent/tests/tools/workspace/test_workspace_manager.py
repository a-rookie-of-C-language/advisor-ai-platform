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


def test_workspace_list_skips_cache_and_supports_recursive(tmp_path):
    manager = WorkspaceManager(str(tmp_path))
    session_path = tmp_path / "1" / "2"
    (session_path / ".cache").mkdir(parents=True)
    (session_path / "docs").mkdir()
    (session_path / "docs" / "a.txt").write_text("a", encoding="utf-8")
    (session_path / "root.txt").write_text("root", encoding="utf-8")
    (session_path / ".cache" / "skip.txt").write_text("skip", encoding="utf-8")

    assert manager.list(1, 2) == [
        {"name": "docs", "type": "dir"},
        {"name": "root.txt", "type": "file", "size": 4},
    ]

    recursive_names = {item["name"] for item in manager.list(1, 2, recursive=True)}
    assert "docs" in recursive_names
    assert "docs\\a.txt" in recursive_names or "docs/a.txt" in recursive_names


def test_workspace_stats_groups_regular_cache_and_final_files(tmp_path):
    manager = WorkspaceManager(str(tmp_path))
    session_path = tmp_path / "1" / "2"
    (session_path / ".cache").mkdir(parents=True)
    (session_path / "final").mkdir()
    (session_path / "regular.txt").write_text("regular", encoding="utf-8")
    (session_path / ".cache" / "cache.txt").write_text("cache", encoding="utf-8")
    (session_path / "final" / "final.txt").write_text("final", encoding="utf-8")

    stats = manager.get_stats(1, 2)

    assert stats["total_files"] == 1
    assert stats["total_size"] == 7
    assert stats["cache_files"] == 1
    assert stats["cache_size"] == 5
    assert stats["final_files"] == 1
    assert stats["final_size"] == 5
