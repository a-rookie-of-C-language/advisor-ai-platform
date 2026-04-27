package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<ApiResponseDTO<Void>> handleBadCredentials(BadCredentialsException e) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponseDTO.error(401, "用户名或密码错误"));
  }

  @ExceptionHandler({DisabledException.class, LockedException.class})
  public ResponseEntity<ApiResponseDTO<Void>> handleAccountStatus(AuthenticationException e) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponseDTO.error(401, "账号已被禁用或锁定"));
  }

  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<ApiResponseDTO<Void>> handleAuthentication(AuthenticationException e) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponseDTO.error(401, "认证失败: " + e.getMessage()));
  }

  @ExceptionHandler(BadRequestException.class)
  public ResponseEntity<ApiResponseDTO<Void>> handleBadRequest(BadRequestException e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiResponseDTO.error(400, e.getMessage()));
  }

  @ExceptionHandler(ForbiddenException.class)
  public ResponseEntity<ApiResponseDTO<Void>> handleForbidden(ForbiddenException e) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(ApiResponseDTO.error(403, e.getMessage()));
  }

  @ExceptionHandler(NotFoundException.class)
  public ResponseEntity<ApiResponseDTO<Void>> handleNotFound(NotFoundException e) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponseDTO.error(404, e.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponseDTO<Void>> handleValidation(MethodArgumentNotValidException e) {
    String msg =
        e.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .findFirst()
            .orElse("参数校验失败");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponseDTO.error(400, msg));
  }

  @ExceptionHandler(AsyncRequestTimeoutException.class)
  public ResponseEntity<?> handleAsyncTimeout(
      AsyncRequestTimeoutException e, HttpServletRequest request) {
    if (isSseRequest(request)) {
      return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(ApiResponseDTO.error(503, "请求超时，请稍后重试"));
  }

  @ExceptionHandler(IOException.class)
  public ResponseEntity<?> handleIoException(IOException e, @Nullable HttpServletRequest request) {
    if (isClientAbort(e)) {
      log.warn("Client disconnected during stream response, reason={}", safeMessage(e));
      return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
    log.error("Unhandled io exception", e);
    if (isSseRequest(request)) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponseDTO.error(500, "服务器内部错误"));
  }

  @ExceptionHandler(RuntimeException.class)
  public ResponseEntity<?> handleRuntime(RuntimeException e, @Nullable HttpServletRequest request) {
    log.error("Unhandled runtime exception", e);
    if (isSseRequest(request)) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponseDTO.error(500, "服务器内部错误"));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<?> handleException(Exception e, @Nullable HttpServletRequest request) {
    log.error("Unhandled checked exception", e);
    if (isSseRequest(request)) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponseDTO.error(500, "internal server error"));
  }

  private boolean isSseRequest(@Nullable HttpServletRequest request) {
    if (request == null) {
      return false;
    }
    String accept = request.getHeader("Accept");
    String contentType = request.getContentType();
    String uri = request.getRequestURI();
    return (accept != null && accept.contains("text/event-stream"))
        || (contentType != null && contentType.contains("text/event-stream"))
        || "/api/chat/stream".equals(uri);
  }

  private boolean isClientAbort(IOException io) {
    String msg = io.getMessage();
    if (msg == null) {
      return false;
    }
    String lower = msg.toLowerCase();
    return lower.contains("broken pipe")
        || lower.contains("connection reset")
        || lower.contains("forcibly closed")
        || lower.contains("stream closed");
  }

  private String safeMessage(Exception exception) {
    String message = exception.getMessage();
    return message == null || message.isBlank() ? "未知错误" : message;
  }
}
