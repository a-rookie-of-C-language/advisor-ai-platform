package cn.edu.cqut.advisorplatform.dto.response;

<<<<<<< HEAD
import java.util.List;
=======
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

<<<<<<< HEAD
=======
import java.util.List;

>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResponseDTO<T> {

<<<<<<< HEAD
  private List<T> records;
  private long total;
  private int page;
  private int size;
  private int pages;

  public static <T> PageResponseDTO<T> of(List<T> records, long total, int page, int size) {
    int pages = (int) Math.ceil((double) total / size);
    return new PageResponseDTO<>(records, total, page, size, pages);
  }
=======
    private List<T> records;
    private long total;
    private int page;
    private int size;
    private int pages;

    public static <T> PageResponseDTO<T> of(List<T> records, long total, int page, int size) {
        int pages = (int) Math.ceil((double) total / size);
        return new PageResponseDTO<>(records, total, page, size, pages);
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
