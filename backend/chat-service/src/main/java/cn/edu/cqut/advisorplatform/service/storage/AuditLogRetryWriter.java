package cn.edu.cqut.advisorplatform.service.storage;

import cn.edu.cqut.advisorplatform.common.retry.FixedBackoffRetryExecutor;
import cn.edu.cqut.advisorplatform.dao.audit.AuditLogDao;
import cn.edu.cqut.advisorplatform.entity.audit.AuditLogDO;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuditLogRetryWriter {

  private static final int MAX_RETRY_ATTEMPTS = 3;
  private static final long RETRY_BACKOFF_MS = 120L;
  private static final FixedBackoffRetryExecutor RETRY_EXECUTOR =
      new FixedBackoffRetryExecutor(MAX_RETRY_ATTEMPTS, RETRY_BACKOFF_MS);

  private final AuditLogDao auditLogDao;
  private final PlatformTransactionManager transactionManager;

  public void saveWithRetryAndFallback(AuditLogDO auditLog) {
    AtomicInteger successAttempt = new AtomicInteger();
    Exception lastError =
        RETRY_EXECUTOR.execute(
            () -> {
              successAttempt.incrementAndGet();
              saveInNewTransaction(auditLog);
            },
            (attempt, maxAttempts, error) ->
                log.warn(
                    "Async audit save retry failed: attempt={}/{}, traceId={}, module={}, action={}, reason={}",
                    attempt,
                    maxAttempts,
                    auditLog.getTraceId(),
                    auditLog.getModule(),
                    auditLog.getAction(),
                    error.getMessage()));
    if (lastError == null) {
      log.debug(
          "Async audit log saved: userId={}, module={}, action={}, traceId={}, attempt={}",
          auditLog.getUserId(),
          auditLog.getModule(),
          auditLog.getAction(),
          auditLog.getTraceId(),
          successAttempt.get());
      return;
    }

    try {
      saveInNewTransaction(auditLog);
      log.warn(
          "Async audit save fallback succeeded: traceId={}, module={}, action={}",
          auditLog.getTraceId(),
          auditLog.getModule(),
          auditLog.getAction());
    } catch (Exception fallbackError) {
      log.error("Failed to save audit log asynchronously", fallbackError);
      if (lastError != null) {
        log.error("Last async retry error", lastError);
      }
    }
  }

  private void saveInNewTransaction(AuditLogDO auditLog) {
    TransactionTemplate template = new TransactionTemplate(transactionManager);
    template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    template.executeWithoutResult(status -> auditLogDao.save(auditLog));
  }
}
