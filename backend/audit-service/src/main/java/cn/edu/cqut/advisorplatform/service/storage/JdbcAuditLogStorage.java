package cn.edu.cqut.advisorplatform.service.storage;

import cn.edu.cqut.advisorplatform.dao.AuditLogDao;
import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Predicate;

@Slf4j
@Service("jdbcAuditLogStorage")
@RequiredArgsConstructor
public class JdbcAuditLogStorage implements AuditLogStorage {

  private final AuditLogDao auditLogDao;
  private final AuditLogRetryWriter retryWriter;

  @Override
  public String storeType() {
    return "jdbc";
  }

  @Override
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void save(AuditLogDO auditLog) {
    auditLogDao.save(auditLog);
  }

  @Override
  @Async
  public void saveAsync(AuditLogDO auditLog) {
    retryWriter.saveWithRetryAndFallback(auditLog);
  }

  @Override
  @Async
  public void saveBatch(List<AuditLogDO> auditLogs) {
    try {
      for (AuditLogDO auditLog : auditLogs) {
        retryWriter.saveWithRetryAndFallback(auditLog);
      }
      log.debug("Async audit logs saved: count={}", auditLogs.size());
    } catch (Exception e) {
      log.error("Failed to save audit logs asynchronously", e);
    }
  }

  @Override
  @Transactional(readOnly = true)
  public PageResponseDTO<AuditLogDO> search(
      Long userId,
      AuditModule module,
      AuditAction action,
      LocalDateTime startTime,
      LocalDateTime endTime,
      Pageable pageable) {
    Specification<AuditLogDO> specification =
        (root, query, cb) -> {
          List<Predicate> predicates = new ArrayList<>();
          if (userId != null) {
            predicates.add(cb.equal(root.get("userId"), userId));
          }
          if (module != null) {
            predicates.add(cb.equal(root.get("module"), module));
          }
          if (action != null) {
            predicates.add(cb.equal(root.get("action"), action));
          }
          if (startTime != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startTime));
          }
          if (endTime != null) {
            predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endTime));
          }
          return cb.and(predicates.toArray(new Predicate[0]));
        };

    Page<AuditLogDO> page = auditLogDao.findAll(specification, pageable);
    return PageResponseDTO.of(
        page.getContent(), page.getTotalElements(), page.getNumber(), page.getSize());
  }

  @Override
  @Transactional(readOnly = true)
  public AuditLogDO findById(Long id) {
    return auditLogDao.findById(id).orElse(null);
  }

  @Override
  @Transactional(readOnly = true)
  public long countByUserAndModule(Long userId, AuditModule module) {
    return auditLogDao.countByUserAndModule(userId, module);
  }

  @Override
  @Transactional(readOnly = true)
  public long countByUserAndModuleAndAction(Long userId, AuditModule module, AuditAction action) {
    return auditLogDao.countByUserAndModuleAndAction(userId, module, action);
  }
}
