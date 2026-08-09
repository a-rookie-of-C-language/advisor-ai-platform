package cn.edu.cqut.advisorplatform.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import org.junit.jupiter.api.Test;

class StudentDetailResponseMapperTest {

  @Test
  void fromEntityUsesDefaultTextWhenOptionalCodesAreNull() {
    StudentProfile entity = new StudentProfile();
    entity.setId(1L);
    entity.setStudentNo("S001");
    entity.setName("张三");

    StudentDetailResponse response = StudentDetailResponseMapper.fromEntity(entity);

    assertThat(response.getGenderText()).isEqualTo("未知");
    assertThat(response.getInfoCompletenessText()).isEqualTo("完整");
    assertThat(response.getRiskLevelText()).isEqualTo("正常");
  }
}
