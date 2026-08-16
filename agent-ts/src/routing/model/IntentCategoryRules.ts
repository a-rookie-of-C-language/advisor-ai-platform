export interface IntentCategoryRule {
  readonly strong: readonly RegExp[];
  readonly weak: readonly RegExp[];
}

export const INTENT_CATEGORY_RULES: Readonly<Record<string, IntentCategoryRule>> = {
  retrieval: {
    strong: [/(?:根据|按照|依据|参考).*(?:知识库|文档|资料)/, /(?:知识库|文档|资料).*(?:回答|说明|解释|总结)/, /(?:之前|以前).*(?:说过|提到|记录)/],
    weak: [/知识库|文档|资料|检索|查找|有没有关于/, /参考.*(?:文档|资料|知识)/]
  },
  search: {
    strong: [/(?:网上|互联网|线上).*(?:搜索|查询|查)/, /(?:最新|新闻|今日|今天|最近).*(?:消息|动态|信息|政策|规定)?/, /天气|股价|汇率|比赛|赛事/],
    weak: [/搜索|搜一下|查一下|搜一搜/, /(?:什么是|是谁|在哪|怎么样).*(?:最新|现在|目前)/]
  },
  memory_read: {
    strong: [/(?:回忆|查阅|查看|读取).*(?:记忆|备忘|笔记)/, /(?:我|我们).*(?:之前|以前).*(?:记住|记录).*(?:什么|内容)/],
    weak: [/记忆|备忘|笔记/, /之前记过|以前记过/]
  },
  memory_write: {
    strong: [/(?:帮我|请|麻烦).*(?:记住|记下|保存)/, /(?:以后|下次).*(?:记住|记得|提醒我)/, /(?:写入|保存|记录|存储).*(?:记忆|备忘|笔记)/],
    weak: [/记住|记下|保存|记录/, /记忆|备忘|笔记/]
  },
  skill: {
    strong: [/(?:调用|使用|展开).*(?:技能|skill)/i, /(?:按照|根据).*(?:技能|skill).*(?:执行|处理)/i],
    weak: [/技能|skill/i, /执行指南|完整指令/]
  },
  student: {
    strong: [/(?:查询|获取|查看).*(?:学生|学号|姓名).*(?:详情|信息|资料|列表)/, /(?:学生|学号|姓名).*(?:是什么|多少|查询|获取|查看)/, /学生详情|学生列表|学生信息/, /签到.*(?:汇总|统计|明细|详情)/, /(?:考勤|签到).*(?:情况|状态|记录)/],
    weak: [/学生|学号|姓名|签到|考勤/, /有哪些学生/, /查一下.*学生/]
  }
};

export const INTENT_CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  writing: "memory_write",
  memory: "memory_read",
  read_memory: "memory_read",
  write_memory: "memory_write",
  expand_skill: "skill"
};

export const DEFAULT_READ_ONLY_CATEGORIES = new Set(["retrieval", "search", "memory_read"]);
