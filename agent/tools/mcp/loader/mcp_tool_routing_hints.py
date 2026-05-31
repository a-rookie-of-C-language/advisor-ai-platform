from __future__ import annotations

MCP_TOOL_QUERY_PATTERNS: dict[str, list[str]] = {
    "list_students": [
        r"学生(?:列表|名单|有哪些|信息)",
        r"(?:查询|查看|获取|列出).*(?:学生|学生列表|学生名单)",
        r"(?:所有|全部|当前|现在).*(?:学生|学生列表|学生名单)",
        r"(?:多少|几个|几名|总共|共有|数量).*(?:学生|学生数量)",
        r"(?:学生|学生数量).*(?:多少|几个|几名|总共|共有|数量)",
    ],
    "get_student": [
        r"(?:查询|获取|查看).*(?:学生|学号|姓名).*(?:详情|信息|资料)",
        r"学生.*(?:学号|姓名).*(?:是什么|查询|获取|查看)",
        r"(?:学号|姓名).*学生",
        r"学生详情",
    ],
    "get_student_checkin_summary": [
        r"学生签到.*(?:汇总|统计|概况|总览)",
        r"签到.*(?:情况|状态|汇总|统计)",
        r"学生.*(?:考勤|签到).*(?:汇总|统计)",
    ],
    "get_student_checkin_detail": [
        r"学生签到.*(?:明细|详情|记录)",
        r"签到.*(?:明细|详情|记录|历史)",
        r"学生.*(?:考勤|签到).*(?:明细|详情|记录)",
    ],
}

MCP_TOOL_SEMANTIC_KEYWORDS: dict[str, list[str]] = {
    "list_students": [
        "学生",
        "学生列表",
        "学生名单",
        "有哪些学生",
        "全部学生",
        "当前学生",
        "学生数量",
        "多少学生",
        "有多少个学生",
    ],
    "get_student": [
        "学生详情",
        "学生信息",
        "学号",
        "姓名",
        "查询学生",
    ],
    "get_student_checkin_summary": [
        "签到汇总",
        "考勤汇总",
        "签到统计",
        "学生考勤",
    ],
    "get_student_checkin_detail": [
        "签到明细",
        "考勤明细",
        "签到记录",
        "考勤记录",
    ],
}


def get_mcp_tool_query_patterns(tool_name: str) -> list[str]:
    return MCP_TOOL_QUERY_PATTERNS.get(tool_name, [])


def get_mcp_tool_semantic_keywords(tool_name: str) -> list[str]:
    return MCP_TOOL_SEMANTIC_KEYWORDS.get(tool_name, [])
