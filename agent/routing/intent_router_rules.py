from __future__ import annotations

import re

CATEGORY_RULES: dict[str, dict[str, list[str]]] = {
    "retrieval": {
        "strong": [
            r"(?:根据|按照|依据|参考).*(?:知识库|文档|资料)",
            r"(?:知识库|文档|资料).*(?:回答|说明|解释|总结)",
            r"(?:之前|以前).*(?:说过|提到|记录)",
        ],
        "weak": [
            r"知识库|文档|资料|检索|查找|有没有关于",
            r"参考.*(?:文档|资料|知识)",
        ],
    },
    "search": {
        "strong": [
            r"(?:网上|互联网|线上).*(?:搜索|查询|查)",
            r"(?:最新|新闻|今日|今天|最近).*(?:消息|动态|信息|政策|规定)?",
            r"(?:天气|股价|汇率|比赛|赛事)",
        ],
        "weak": [
            r"搜索|搜一下|查一下|搜一搜",
            r"(?:什么是|是谁|在哪|怎么样).*(?:最新|现在|目前)",
        ],
    },
    "memory_read": {
        "strong": [
            r"(?:回忆|查阅|查看|读取).*(?:记忆|备忘|笔记)",
            r"(?:我|我们).*(?:之前|以前).*(?:记住|记录).*(?:什么|内容)",
        ],
        "weak": [
            r"记忆|备忘|笔记",
            r"之前记过|以前记过",
        ],
    },
    "memory_write": {
        "strong": [
            r"(?:帮我|请|麻烦).*(?:记住|记下|保存)",
            r"(?:以后|下次).*(?:记住|记得|提醒我)",
            r"(?:写入|保存|记录|存储).*(?:记忆|备忘|笔记)",
        ],
        "weak": [
            r"记住|记下|保存|记录",
            r"记忆|备忘|笔记",
        ],
    },
    "skill": {
        "strong": [
            r"(?:调用|使用|展开).*(?:技能|skill)",
            r"(?:按照|根据).*(?:技能|skill).*(?:执行|处理)",
        ],
        "weak": [
            r"技能|skill",
            r"执行指南|完整指令",
        ],
    },
    "student": {
        "strong": [
            r"(?:查询|获取|查看).*(?:学生|学号|姓名).*(?:详情|信息|资料|列表)",
            r"(?:学生|学号|姓名).*(?:是什么|多少|查询|获取|查看)",
            r"学生详情|学生列表|学生信息",
            r"签到.*(?:汇总|统计|明细|详情)",
            r"(?:考勤|签到).*(?:情况|状态|记录)",
        ],
        "weak": [
            r"学生|学号|姓名|签到|考勤",
            r"有哪些学生",
            r"查一下.*学生",
        ],
    },
}

CATEGORY_DESCRIPTIONS: dict[str, str] = {
    "retrieval": "基于知识库、文档、资料做检索与问答。",
    "search": "查询互联网最新时效信息。",
    "memory_read": "读取长期记忆、历史备忘或已保存用户信息。",
    "memory_write": "将用户偏好、约定或备忘写入长期记忆。",
    "skill": "展开技能说明或执行指南。",
    "meta": "元能力工具，通常仅在明确要求展开技能时使用。",
    "student": "查询学生信息、学号、姓名、签到记录等学生相关数据。",
}

DEFAULT_READ_ONLY_CATEGORIES = {"retrieval", "search", "memory_read"}

CATEGORY_ALIASES = {
    "writing": "memory_write",
    "memory": "memory_read",
    "read_memory": "memory_read",
    "write_memory": "memory_write",
    "expand_skill": "skill",
}

URL_PATTERN = re.compile(r"https?://[^\s)>\"]+")
