package cn.edu.cqut.advisorplatform.checkin.attendance.service;

import cn.edu.cqut.advisorplatform.checkin.client.AuthServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.StudentServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AttendanceAccessSupport {
  private final AuthServiceClient authServiceClient;
  private final StudentServiceClient studentServiceClient;

  public void requireAnyRole(UserPrincipal userPrincipal, UserRole... roles) {
    if (userPrincipal == null) {
      throw new ForbiddenException("无权执行该操作");
    }
    for (UserRole role : roles) {
      if (userPrincipal.getRole() == role) {
        return;
      }
    }
    throw new ForbiddenException("无权执行该操作");
  }

  public String requireMonitorClassCode(UserPrincipal userPrincipal) {
    requireAnyRole(userPrincipal, UserRole.MONITOR);
    var identity = authServiceClient.getIdentity(userPrincipal.getId(), "MONITOR");
    if (identity == null
        || identity.getIdentityNo() == null
        || identity.getIdentityNo().isBlank()) {
      throw new BadRequestException("班长账号未绑定学生身份号");
    }
    StudentClassResponse student = studentServiceClient.getStudentClass(identity.getIdentityNo());
    if (student == null || student.getClassCode() == null || student.getClassCode().isBlank()) {
      throw new BadRequestException("班长未绑定班级");
    }
    return student.getClassCode();
  }

  public void requireSameClass(String allowedClassCode, String actualClassCode) {
    if (allowedClassCode == null || !allowedClassCode.equals(actualClassCode)) {
      throw new ForbiddenException("只能操作本班考勤");
    }
  }

  public Long requireUserId(UserPrincipal userPrincipal) {
    if (userPrincipal == null || userPrincipal.getId() == null) {
      throw new BadRequestException("用户未登录");
    }
    return userPrincipal.getId();
  }
}
