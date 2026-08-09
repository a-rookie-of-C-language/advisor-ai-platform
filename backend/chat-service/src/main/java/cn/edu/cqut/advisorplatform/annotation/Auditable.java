package cn.edu.cqut.advisorplatform.annotation;

import cn.edu.cqut.advisorplatform.entity.audit.AuditAction;
import cn.edu.cqut.advisorplatform.entity.audit.AuditModule;
import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Auditable {

  AuditModule module();

  AuditAction action();

  boolean logRequestParams() default true;

  boolean logResponseData() default false;

  String description() default "";
}
