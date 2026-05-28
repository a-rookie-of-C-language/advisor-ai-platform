package cn.edu.cqut.advisorplatform.checkin.mapper;

import cn.edu.cqut.advisorplatform.checkin.annotation.AutoFill;
import cn.edu.cqut.advisorplatform.checkin.enums.OperationType;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInException;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CheckInExceptionMapper {

  @AutoFill(value = OperationType.INSERT)
  int insertException(CheckInException exception);

  List<CheckInException> selectExceptions(
      @Param("studentId") Long studentId,
      @Param("checkInId") String checkInId,
      @Param("status") String status,
      @Param("handlerId") Long handlerId);

  CheckInException selectExceptionById(@Param("id") Long id);

  int updateException(
      @Param("id") Long id,
      @Param("status") String status,
      @Param("handlerId") Long handlerId,
      @Param("handlerNote") String handlerNote);

  int countExceptionsByStatus(@Param("status") String status);

  List<CheckInException> selectPendingExceptions();
}
