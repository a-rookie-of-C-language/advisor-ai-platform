package cn.edu.cqut.advisorplatform.annotation;

import cn.edu.cqut.advisorplatform.entity.AuditLogDO;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Auditable {

    AuditLogDO.AuditModule module();

    AuditLogDO.AuditAction action();

    boolean logRequestParams() default true;

    boolean logResponseData() default false;

    String description() default "";
}
