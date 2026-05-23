package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInSummaryResponse;
import java.util.List;

public interface StudentCheckInService {

  StudentCheckInSummaryResponse getStudentCheckInSummary(Long studentId);

  StudentCheckInDetailResponse getStudentCheckInDetail(Long studentId, int limit);

  List<StudentCheckInSummaryResponse> listStudentCheckInSummaries(
      String keyword, int page, int size);
}
