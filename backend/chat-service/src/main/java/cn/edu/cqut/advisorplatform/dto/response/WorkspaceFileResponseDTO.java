package cn.edu.cqut.advisorplatform.dto.response;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceFileResponseDTO {

  private Long id;
  private String fileName;
  private String fileType;
  private Long fileSize;
  private LocalDateTime createdAt;
}
