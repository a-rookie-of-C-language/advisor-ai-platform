package cn.edu.cqut.advisorplatform.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResponseDTO<T> {

  private List<T> records;
  private long total;
  private int page;
  private int size;
  private int pages;

  public static <T> PageResponseDTO<T> of(List<T> records, long total, int page, int size) {
    int pages = (int) Math.ceil((double) total / size);
    return new PageResponseDTO<>(records, total, page, size, pages);
  }
}
