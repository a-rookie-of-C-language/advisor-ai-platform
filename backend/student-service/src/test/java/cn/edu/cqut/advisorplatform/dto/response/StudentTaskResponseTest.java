package cn.edu.cqut.advisorplatform.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import cn.edu.cqut.advisorplatform.entity.StudentTask;
import org.junit.jupiter.api.Test;

class StudentTaskResponseTest {

  @Test
  void fromEntityUsesDefaultStatusTextWhenStatusIsNull() {
    StudentTask entity = new StudentTask();
    entity.setId(1L);

    StudentTaskResponse response = StudentTaskResponse.fromEntity(entity);

    assertThat(response.getTaskTypeText()).isEqualTo("信息缺失");
    assertThat(response.getTaskStatusText()).isEqualTo("待处理");
  }
}
