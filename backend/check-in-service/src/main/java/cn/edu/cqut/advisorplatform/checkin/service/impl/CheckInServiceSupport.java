package cn.edu.cqut.advisorplatform.checkin.service.impl;

import cn.edu.cqut.advisorplatform.checkin.client.AuthServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.StudentServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.client.dto.UserIdentityResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal.UserRole;
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
      throw new ForbiddenException("鏃犳潈鎵ц璇ユ搷浣?");
    }
  }

  public StudentClassResponse requireCurrentStudent(UserPrincipal userPrincipal) {
    UserIdentityResponse identity = requireIdentity(userPrincipal.getId(), "STUDENT");
    StudentClassResponse student = studentServiceClient.getStudentClass(identity.getIdentityNo());
    if (student == null || student.getClassCode() == null || student.getClassCode().isBlank()) {
      throw new BadRequestException("瀛︾敓鏈粦瀹氱彮绾?");
    }
    return student;
  }

  public UserIdentityResponse requireIdentity(Long userId, String identityType) {
    UserIdentityResponse identity = authServiceClient.getIdentity(userId, identityType);
    if (identity == null
        || identity.getIdentityNo() == null
        || identity.getIdentityNo().isBlank()) {
      throw new BadRequestException("鐢ㄦ埛鏈粦瀹? " + identityType + "韬唤");
    }
    return identity;
  }

  public void validateActivityRequest(CreateCheckInActivityRequest request) {
    if (request.getStartTime() == null
        || request.getEndTime() == null
        || !request.getStartTime().isBefore(request.getEndTime())) {
      throw new BadRequestException("鎵撳崱鏃堕棿鑼冨洿涓嶅悎娉?");
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
      throw new BadRequestException("鐝骇涓嶈兘涓虹┖");
    }
    return values;
  }

  public LocalDate[] normalizeDateRange(LocalDate begin, LocalDate end) {
    LocalDate normalizedBegin = begin == null ? LocalDate.now() : begin;
    LocalDate normalizedEnd = end == null ? normalizedBegin : end;
    if (normalizedBegin.isAfter(normalizedEnd)) {
      throw new BadRequestException("寮€濮嬫棩鏈熶笉鑳芥櫄浜庣粨鏉熸棩鏈?");
    }
    return new LocalDate[] {normalizedBegin, normalizedEnd};
  }

  public String resolveTitle(String title, String courseName) {
    return title == null || title.isBlank() ? courseName + "璇惧爞鎵撳崱" : title.trim();
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

  public StudentCheckInDetailResponse.CheckInRecordItem toRecordItem(CheckInRecordVO record) {
    StudentCheckInDetailResponse.CheckInRecordItem item =
        new StudentCheckInDetailResponse.CheckInRecordItem();
    item.setCheckDate(record.getCheckDate().toString());
    item.setCheckedIn(record.getCheckedIn());
    item.setCheckTime(record.getCheckTime());
    return item;
  }

  public String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
