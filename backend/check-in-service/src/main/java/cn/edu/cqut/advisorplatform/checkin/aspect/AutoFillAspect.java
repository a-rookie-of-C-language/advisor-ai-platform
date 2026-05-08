package cn.edu.cqut.advisorplatform.checkin.aspect;

import cn.edu.cqut.advisorplatform.checkin.annotation.AutoFill;
import cn.edu.cqut.advisorplatform.checkin.constant.AutoFillConstant;
import cn.edu.cqut.advisorplatform.checkin.enums.OperationType;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

@Aspect
@Component
@Slf4j
public class AutoFillAspect {

    @Pointcut("execution(* cn.edu.cqut.advisorplatform.checkin.mapper.*.*(..)) && @annotation(cn.edu.cqut.advisorplatform.checkin.annotation.AutoFill)")
    public void autoFillPointCut(){}

    @Before("autoFillPointCut()")
    public void autoFill(JoinPoint joinPoint){
        log.info("开始为公共字段自动填充日期");

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        AutoFill autoFill = signature.getMethod().getAnnotation(AutoFill.class);
        OperationType operationType = autoFill.value();

        Object[] args = joinPoint.getArgs();
        if(args == null || args.length == 0){
            return;
        }

        Object entity = args[0];
        LocalDateTime now = LocalDateTime.now();

        try{
            if (operationType == OperationType.INSERT){
                Method setCreatedAt = entity.getClass()
                    .getDeclaredMethod(AutoFillConstant.SET_CREATED_AT,LocalDateTime.class);
                Method setUpdatedAt = entity.getClass()
                    .getDeclaredMethod(AutoFillConstant.SET_UPDATED_AT,LocalDateTime.class);

                setCreatedAt.invoke(entity,now);
                setUpdatedAt.invoke(entity,now);
            }else if(operationType == OperationType.UPDATE) {
                Method setUpdatedAt = entity.getClass()
                    .getDeclaredMethod(AutoFillConstant.SET_UPDATED_AT,LocalDateTime.class);

                setUpdatedAt.invoke(entity,now);
            }
        }catch (Exception e){
            log.error("公共字段自动填充失败",e);
            throw new RuntimeException("公共字段自动填充失败",e);
        }
    }
}
