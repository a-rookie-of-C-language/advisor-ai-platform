package cn.edu.cqut.advisorplatform.checkin.service.impl;

import cn.edu.cqut.advisorplatform.checkin.client.AuthServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.StudentServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.client.dto.UserIdentityResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInActivityVO;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class CheckInServiceSupport {

  private final AuthServiceClient authServiceClient;
  private final StudentServiceClient studentServiceClient;

  public CheckInServiceSupport(
      AuthServiceClient authServiceClient, StudentServiceClient studentServiceClient) {
    this.authServiceClient = authServiceClient;
    this.studentServiceClient = studentServiceClient;
  }

  public void requireRole(UserPrincipal userPrincipal, UserRole requiredRole) {
    if (userPrincipal == null || userPrincipal.getRole() != requiredRole) {
      throw new ForbiddenException("无权执行该操作");
    }
  }

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

  public StudentClassResponse requireCurrentStudent(UserPrincipal userPrincipal) {
    UserIdentityResponse identity = requireIdentity(userPrincipal.getId(), "STUDENT");
    StudentClassResponse student = studentServiceClient.getStudentClass(identity.getIdentityNo());
    if (student == null || student.getClassCode() == null || student.getClassCode().isBlank()) {
      throw new BadRequestException("学生未绑定班级");
    }
    return student;
  }

  public UserIdentityResponse requireIdentity(Long userId, String identityType) {
    UserIdentityResponse identity = authServiceClient.getIdentity(userId, identityType);
    if (identity == null
        || identity.getIdentityNo() == null
        || identity.getIdentityNo().isBlank()) {
      throw new BadRequestException("用户未绑定 " + identityType + " 身份");
    }
    return identity;
  }

  public void validateActivityRequest(CreateCheckInActivityRequest request) {
    if (request.getStartTime() == null
        || request.getEndTime() == null
        || !request.getStartTime().isBefore(request.getEndTime())) {
      throw new BadRequestException("打卡时间范围不合法");
    }
  }

  public Set<String> normalizeClassCodes(List<String> classCodes) {
    Set<String> values = new LinkedHashSet<>();
    for (String classCode : classCodes) {
      if (classCode != null && !classCode.isBlank()) {
        values.add(classCode.trim());
      }
    }
    if (values.isEmpty()) {
      throw new BadRequestException("班级不能为空");
    }
    return values;
  }

  public LocalDate[] normalizeDateRange(LocalDate begin, LocalDate end) {
    LocalDate normalizedBegin = begin == null ? LocalDate.now().minusDays(6) : begin;
    LocalDate normalizedEnd = end == null ? normalizedBegin : end;
    if (normalizedBegin.isAfter(normalizedEnd)) {
      throw new BadRequestException("开始日期不能晚于结束日期");
    }
    return new LocalDate[] {normalizedBegin, normalizedEnd};
  }

  public String resolveTitle(String title, String courseName) {
    return title == null || title.isBlank() ? courseName + "课堂打卡" : title.trim();
  }

  public CheckInActivityVO toActivityVO(CheckInActivity activity, List<String> classCodes) {
    CheckInActivityVO vo = new CheckInActivityVO();
    vo.setCheckInId(activity.getCheckInId());
    vo.setCourseId(activity.getCourseId());
    vo.setCourseName(activity.getCourseName());
    vo.setTitle(activity.getTitle());
    vo.setTeacherNo(activity.getTeacherNo());
    vo.setClassCodes(classCodes);
    vo.setStatus(activity.getStatus());
    vo.setStartTime(activity.getStartTime());
    vo.setEndTime(activity.getEndTime());
    return vo;
  }

  public String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  public Long resolveUserId(UserPrincipal userPrincipal) {
    if (userPrincipal == null) {
      throw new BadRequestException("用户未登录");
    }
    return userPrincipal.getId();
  }
}
