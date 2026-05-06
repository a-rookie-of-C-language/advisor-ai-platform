package cn.edu.cqut.advisorplatform.riskcontrol.controller;

import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class RiskExceptionHandler {

  @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
  public ResponseEntity<ValidationErrorResponse> handleValidationException(Exception ex) {
    String message;
    if (ex instanceof MethodArgumentNotValidException manv) {
      message =
          manv.getBindingResult().getFieldErrors().stream()
              .map(err -> err.getField() + ": " + err.getDefaultMessage())
              .collect(Collectors.joining("; "));
    } else if (ex instanceof BindException be) {
      message =
          be.getBindingResult().getFieldErrors().stream()
              .map(err -> err.getField() + ": " + err.getDefaultMessage())
              .collect(Collectors.joining("; "));
    } else {
      message = "invalid request";
    }
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new ValidationErrorResponse(400, message));
  }

  public record ValidationErrorResponse(int code, String message) {}
}
