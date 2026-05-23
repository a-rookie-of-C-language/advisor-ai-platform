package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.StudentClassResponse;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/student")
@RequiredArgsConstructor
public class StudentInternalController {
  private final StudentService studentService;

  @GetMapping("/no/{studentNo}/class")
  public StudentClassResponse getStudentClass(@PathVariable("studentNo") String studentNo) {
    StudentProfile student = studentService.getStudentEntityByStudentNo(studentNo);
    return StudentClassResponse.from(student);
  }
}
