package cn.edu.cqut.advisorplatform.aspect;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import java.lang.reflect.Method;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

  private final AuditLogSupport auditLogSupport;

  @Around("@annotation(cn.edu.cqut.advisorplatform.annotation.Auditable)")
  public Object audit(ProceedingJoinPoint joinPoint) throws Throwable {
    MethodSignature signature = (MethodSignature) joinPoint.getSignature();
    Method method = signature.getMethod();
    Auditable auditable = method.getAnnotation(Auditable.class);

    AuditModule module = auditable.module();
    AuditAction action = auditable.action();
    boolean logParams = auditable.logRequestParams();
    boolean logResponse = auditable.logResponseData();
    String description = auditable.description();

    long startTime = System.currentTimeMillis();

    Object result = null;
    Throwable exception = null;
    try {
      result = joinPoint.proceed();
      return result;
    } catch (Throwable e) {
      exception = e;
      throw e;
    } finally {
      long duration = System.currentTimeMillis() - startTime;
      auditLogSupport.saveAuditLog(
          joinPoint,
          signature,
          method,
          module,
          action,
          logParams,
          logResponse,
          description,
          duration,
          result,
          exception);
    }
  }
}
