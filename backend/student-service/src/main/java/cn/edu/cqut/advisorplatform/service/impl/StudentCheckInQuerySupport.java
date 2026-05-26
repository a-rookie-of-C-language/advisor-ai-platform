package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.client.CheckInServiceClient;
import cn.edu.cqut.advisorplatform.dao.StudentProfileDao;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.exception.BusinessException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StudentCheckInQuerySupport {

  private final StudentProfileDao studentProfileDao;
  private final CheckInServiceClient checkInServiceClient;

  public StudentCheckInSummaryResponse getStudentCheckInSummary(Long studentId) {
    return checkInServiceClient.listStudentCheckInSummaries(List.of(studentId)).stream()
        .findFirst()
        .orElseThrow(() -> new BusinessException("学生不存在"));
  }

  public StudentCheckInDetailResponse getStudentCheckInDetail(Long studentId, int limit) {
    return checkInServiceClient.getStudentCheckInDetail(studentId, limit);
  }

  public List<StudentCheckInSummaryResponse> listStudentCheckInSummaries(
      String keyword, int page, int size) {
    Page<StudentProfile> profiles =
        studentProfileDao.findByConditions(
            null, null, null, null, null, keyword, PageRequest.of(page, size));
    List<Long> studentIds = profiles.stream().map(StudentProfile::getId).toList();
    if (studentIds.isEmpty()) {
      return List.of();
    }
    return checkInServiceClient.listStudentCheckInSummaries(studentIds);
  }
}
