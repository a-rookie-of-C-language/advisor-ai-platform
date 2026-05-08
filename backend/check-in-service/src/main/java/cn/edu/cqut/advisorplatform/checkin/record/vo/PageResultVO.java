package cn.edu.cqut.advisorplatform.checkin.record.vo;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PageResultVO<T> {
  private Long total;
  private List<T> records;
}
