package cn.edu.cqut.advisorplatform.checkin.record.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class HandleExceptionRequest {

  @NotBlank(message = "状态不能为空")
  private String status;

  private String handlerNote;
}
