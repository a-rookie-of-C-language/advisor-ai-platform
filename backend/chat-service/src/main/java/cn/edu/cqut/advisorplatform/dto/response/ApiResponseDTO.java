package cn.edu.cqut.advisorplatform.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ApiResponseDTO<T> {

<<<<<<< HEAD
  private int code;
  private String message;
  private T data;

  public static <T> ApiResponseDTO<T> success(T data) {
    return new ApiResponseDTO<>(200, "success", data);
  }

  public static <T> ApiResponseDTO<T> success() {
    return new ApiResponseDTO<>(200, "success", null);
  }

  public static <T> ApiResponseDTO<T> error(int code, String message) {
    return new ApiResponseDTO<>(code, message, null);
  }
=======
    private int code;
    private String message;
    private T data;

    public static <T> ApiResponseDTO<T> success(T data) {
        return new ApiResponseDTO<>(200, "success", data);
    }

    public static <T> ApiResponseDTO<T> success() {
        return new ApiResponseDTO<>(200, "success", null);
    }

    public static <T> ApiResponseDTO<T> error(int code, String message) {
        return new ApiResponseDTO<>(code, message, null);
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
