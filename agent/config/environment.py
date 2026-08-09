"""集中管理环境变量读取，避免重复定义读取工具函数。"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def read_required_env(name: str) -> str:
    """读取必填环境变量，缺失或空白时抛出 RuntimeError。"""
    value = os.getenv(name)
    if value is not None and value.strip():
        return value.strip()
    raise RuntimeError(f"Missing required env: {name}")


def read_str_env(name: str, default: str = "") -> str:
    """读取字符串环境变量，缺失时返回 default。"""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip()


def read_int_env(name: str, default: int) -> int:
    """读取整数环境变量，解析失败时返回 default 并记录警告。"""
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Env %s is invalid, fallback to %s", name, default)
        return default


def read_float_env(name: str, default: float) -> float:
    """读取浮点数环境变量，解析失败时返回 default 并记录警告。"""
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        logger.warning("Env %s is invalid, fallback to %.1f", name, default)
        return default


def read_bool_env(name: str, default: bool) -> bool:
    """读取布尔环境变量，支持 1/true/yes/on 为 True。"""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}
