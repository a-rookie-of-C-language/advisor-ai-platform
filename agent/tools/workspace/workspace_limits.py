from __future__ import annotations

BINARY_EXTENSIONS = {
    ".exe", ".dll", ".so", ".bin", ".a", ".o",
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
    ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z", ".bz2",
    ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
}

MAX_FILE_SIZE = 1048576
MAX_DEPTH = 5
MAX_FILES_PER_SESSION = 50
CACHE_DIR = ".cache"
FINAL_DIR = "final"
OPERATION_TIMEOUT = 10.0
