package cn.edu.cqut.advisorplatform.teacher.dto.response;

import java.util.List;
import lombok.Data;

@Data
public class CourseTeachingClassResponse {
  private Long courseId;
  private String courseName;
  private String semester;
  private List<String> classCodes;
}
