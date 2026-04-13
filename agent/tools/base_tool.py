from abc import ABC, abstractmethod
from typing import Any


class BaseTool(ABC):
    """所有 Tool 的抽象父类。

    子类必须实现 run 方法，并通过 name/description 描述工具用途，
    以便 Agent 在工具选择时使用。
    """

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    @abstractmethod
    def run(self, *args: Any, **kwargs: Any) -> Any:
        """执行工具逻辑，子类必须实现。"""

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        """支持直接调用实例：tool(...)"""
        return self.run(*args, **kwargs)

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name!r})"
