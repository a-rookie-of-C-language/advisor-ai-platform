package cn.edu.cqut.advisorplatform.aspect.audit;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.entity.audit.AuditAction;
import cn.edu.cqut.advisorplatform.entity.audit.AuditModule;
import java.util.Map;

class AuditAspectSanitizeTestController {

  @Auditable(module = AuditModule.AUTH, action = AuditAction.STORE, logRequestParams = true)
  public String save(Map<String, Object> body) {
    return "ok";
  }
}
