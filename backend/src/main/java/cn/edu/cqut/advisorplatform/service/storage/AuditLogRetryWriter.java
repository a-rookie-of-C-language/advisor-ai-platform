package cn.edu.cqut.advisorplatform.service.storage;

import cn.edu.cqut.advisorplatform.dao.AuditLogDao;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
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

    private final AuditLogDao auditLogDao;
    private final PlatformTransactionManager transactionManager;

    public void saveWithRetryAndFallback(AuditLogDO auditLog) {
        Exception lastError = null;
        for (int attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                saveInNewTransaction(auditLog);
                log.debug(
                        "Async audit log saved: userId={}, module={}, action={}, traceId={}, attempt={}",
                        auditLog.getUserId(),
                        auditLog.getModule(),
                        auditLog.getAction(),
                        auditLog.getTraceId(),
                        attempt
                );
                return;
            } catch (Exception e) {
                lastError = e;
                log.warn(
                        "Async audit save retry failed: attempt={}/{}, traceId={}, module={}, action={}, reason={}",
                        attempt,
                        MAX_RETRY_ATTEMPTS,
                        auditLog.getTraceId(),
                        auditLog.getModule(),
                        auditLog.getAction(),
                        e.getMessage()
                );
                sleepBackoff();
            }
        }

        try {
            saveInNewTransaction(auditLog);
            log.warn(
                    "Async audit save fallback succeeded: traceId={}, module={}, action={}",
                    auditLog.getTraceId(),
                    auditLog.getModule(),
                    auditLog.getAction()
            );
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

    private void sleepBackoff() {
        try {
            Thread.sleep(RETRY_BACKOFF_MS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }
}
