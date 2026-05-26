package cn.edu.cqut.advisorplatform.aspect;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.entity.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditModule;

class AuditAspectTestController {

  @Auditable(
      module = AuditModule.MEMORY,
      action = AuditAction.SEARCH,
      logRequestParams = false,
      description = "memory_search")
  public String search(String keyword) {
    return keyword;
  }

  @Auditable(module = AuditModule.MEMORY, action = AuditAction.SEARCH, logRequestParams = false)
  public String failingSearch(String keyword) {
    return keyword;
  }
}
