package cn.edu.cqut.advisorplatform.common.exception;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
  private int code;
  private String errorCode;
  private String message;
  private LocalDateTime timestamp;

  public ErrorResponse(int code, String message, LocalDateTime timestamp) {
    this.code = code;
    this.errorCode = null;
    this.message = message;
    this.timestamp = timestamp;
  }

  public static ErrorResponse of(ErrorCode errorCode) {
    return new ErrorResponse(
        errorCode.getCode(), errorCode.name(), errorCode.getMessage(), LocalDateTime.now());
  }

  public static ErrorResponse of(ErrorCode errorCode, String detail) {
    return new ErrorResponse(errorCode.getCode(), errorCode.name(), detail, LocalDateTime.now());
  }

  public static ErrorResponse of(int code, String message) {
    return new ErrorResponse(code, null, message, LocalDateTime.now());
  }
}
