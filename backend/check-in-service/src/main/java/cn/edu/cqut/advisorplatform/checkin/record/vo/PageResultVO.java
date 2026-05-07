package cn.edu.cqut.advisorplatform.checkin.record.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PageResultVO<T> {
    private Long total;
    private List<T> records;
}
