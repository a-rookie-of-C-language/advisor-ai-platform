package cn.edu.cqut.advisorplatform.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class StudentControllerSecurityAnnotationTest {

  private static final String STUDENT_MANAGER_ROLES = "hasAnyRole('ADMIN', 'ADVISOR')";

  @Test
  void studentControllerRequiresAdminOrAdvisor() {
    PreAuthorize annotation = StudentController.class.getAnnotation(PreAuthorize.class);

    assertNotNull(annotation);
    assertEquals(STUDENT_MANAGER_ROLES, annotation.value());
  }

  @Test
  void studentImportControllerRequiresAdminOrAdvisor() {
    PreAuthorize annotation = StudentImportController.class.getAnnotation(PreAuthorize.class);

    assertNotNull(annotation);
    assertEquals(STUDENT_MANAGER_ROLES, annotation.value());
  }
}
