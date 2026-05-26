from __future__ import annotations

from pathlib import Path


def build_workspace_listing(path: Path, recursive: bool = False) -> list[dict]:
    if not path.exists():
        return []

    if not path.is_dir():
        return [{"name": path.name, "type": "file", "size": path.stat().st_size}]

    results: list[dict] = []
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
        return results

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
