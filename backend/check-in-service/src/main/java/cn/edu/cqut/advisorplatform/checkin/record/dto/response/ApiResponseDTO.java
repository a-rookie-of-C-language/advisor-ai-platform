package cn.edu.cqut.advisorplatform.checkin.record.dto.response;

import cn.edu.cqut.advisorplatform.checkin.constant.CheckInConstant;
import cn.edu.cqut.advisorplatform.checkin.constant.ResponseCodeConstant;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiResponseDTO<T> {

    private int code;
    private String message;
    private T data;

    public static <T> ApiResponseDTO<T> success(T data){
        return new ApiResponseDTO<>(ResponseCodeConstant.SUCCESS, CheckInConstant.DEFAULT_SUCCESS_MESSAGE,data);
    }

    public static <T> ApiResponseDTO<T> success() {
        return new ApiResponseDTO<>(ResponseCodeConstant.SUCCESS, CheckInConstant.DEFAULT_SUCCESS_MESSAGE, null);
    }

    public static <T> ApiResponseDTO<T> error(int code, String message) {
        return new ApiResponseDTO<>(code, message, null);
    }
}
