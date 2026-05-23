package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.request.StudentCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentQueryRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentUpdateRequest;
import cn.edu.cqut.advisorplatform.dto.response.StudentDetailResponse;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import org.springframework.data.domain.Page;

public interface StudentService {

  Page<StudentDetailResponse> queryStudents(StudentQueryRequest request);

  StudentDetailResponse getStudentById(Long id);

  StudentDetailResponse createStudent(StudentCreateRequest request, String operator);

  StudentDetailResponse updateStudent(StudentUpdateRequest request, String operator);

  void deleteStudent(Long id, String operator);

  StudentProfile getStudentEntityById(Long id);

  StudentProfile getStudentEntityByStudentNo(String studentNo);

  void calculateAndUpdateInfoCompleteness(StudentProfile profile);
}
