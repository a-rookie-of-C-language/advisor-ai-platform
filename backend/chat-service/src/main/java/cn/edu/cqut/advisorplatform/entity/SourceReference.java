package cn.edu.cqut.advisorplatform.entity;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class SourceReference {
  private Long documentId;
  private String docName;
  private String snippet;
}
