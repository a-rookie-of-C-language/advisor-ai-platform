package cn.edu.cqut.advisorplatform.common.exception;

import lombok.Getter;

/**
 * 统一错误码枚举
 *
 * <p>格式：CATEGORY_HTTP_STATUS，例如 BAD_REQUEST_400
 */
@Getter
public enum ErrorCode {
  // 通用错误 4xx
  BAD_REQUEST_400(400, "请求参数错误"),
  UNAUTHORIZED_401(401, "未认证或认证已失效"),
  FORBIDDEN_403(403, "无权访问"),
  NOT_FOUND_404(404, "资源不存在"),
  METHOD_NOT_ALLOWED_405(405, "请求方法不允许"),
  CONFLICT_409(409, "资源冲突"),
  UNPROCESSABLE_ENTITY_422(422, "请求无法处理"),

  // 通用错误 5xx
  INTERNAL_ERROR_500(500, "服务器内部错误"),
  SERVICE_UNAVAILABLE_503(503, "服务暂不可用"),

  // 认证相关 1xxx
  AUTH_INVALID_CREDENTIALS_1001(401, "用户名或密码错误"),
  AUTH_TOKEN_EXPIRED_1002(401, "Token已过期"),
  AUTH_TOKEN_INVALID_1003(401, "Token无效"),
  AUTH_USER_DISABLED_1004(403, "用户已被禁用"),

  // 聊天相关 2xxx
  CHAT_SESSION_NOT_FOUND_2001(404, "会话不存在"),
  CHAT_MESSAGE_FAILED_2002(500, "消息发送失败"),
  CHAT_AGENT_UNAVAILABLE_2003(503, "AI服务暂不可用"),
  CHAT_STREAM_TIMEOUT_2004(504, "AI响应超时"),

  // 知识库相关 3xxx
  RAG_KB_NOT_FOUND_3001(404, "知识库不存在"),
  RAG_DOCUMENT_UPLOAD_FAILED_3002(500, "文档上传失败"),
  RAG_INDEX_FAILED_3003(500, "文档索引失败"),

  // 学生相关 4xxx
  STUDENT_NOT_FOUND_4001(404, "学生不存在"),
  STUDENT_DUPLICATE_4002(409, "学生已存在"),
  STUDENT_IMPORT_FAILED_4003(500, "学生导入失败"),

  // 签到相关 5xxx
  CHECKIN_NOT_FOUND_5001(404, "签到活动不存在"),
  CHECKIN_ALREADY_SIGNED_5002(409, "已签到"),
  CHECKIN_EXPIRED_5003(400, "签到已过期"),

  // 风控相关 6xxx
  RISK_CONTENT_BLOCKED_6001(451, "内容不合规，已被过滤"),
  RISK_RATE_LIMITED_6002(429, "请求过于频繁，请稍后重试"),
  RISK_PROMPT_INJECTION_6003(400, "检测到提示注入攻击"),

  // 记忆相关 7xxx
  MEMORY_NOT_FOUND_7001(404, "记忆不存在"),
  MEMORY_STORE_FAILED_7002(500, "记忆存储失败");

  private final int code;
  private final String message;

  ErrorCode(int code, String message) {
    this.code = code;
    this.message = message;
  }
}
