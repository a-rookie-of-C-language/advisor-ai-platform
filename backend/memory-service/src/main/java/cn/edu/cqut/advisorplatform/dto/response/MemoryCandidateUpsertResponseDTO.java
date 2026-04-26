package cn.edu.cqut.advisorplatform.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MemoryCandidateUpsertResponseDTO {

  private int accepted;
  private int rejected;
  private String message;

  public static MemoryCandidateUpsertResponseDTO of(int accepted, int rejected, String message) {
    return new MemoryCandidateUpsertResponseDTO(accepted, rejected, message);
  }
}
