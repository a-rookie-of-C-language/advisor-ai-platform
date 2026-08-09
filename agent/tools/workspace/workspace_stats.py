from __future__ import annotations

from pathlib import Path

from tools.workspace.workspace_limits import CACHE_DIR, FINAL_DIR


def build_workspace_stats(
    session_path: Path,
    user_id: int | None,
    session_id: int | None,
) -> dict:
    total_files = 0
    total_size = 0
    cache_files = 0
    cache_size = 0
    final_files = 0
    final_size = 0

    if session_path.exists():
        for item in session_path.rglob("*"):
            if not item.is_file():
                continue
            size = item.stat().st_size
            parts = item.parts
            if CACHE_DIR in parts:
                cache_files += 1
                cache_size += size
            elif FINAL_DIR in parts:
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
