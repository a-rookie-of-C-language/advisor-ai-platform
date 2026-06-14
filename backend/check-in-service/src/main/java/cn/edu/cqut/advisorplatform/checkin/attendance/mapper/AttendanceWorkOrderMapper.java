package cn.edu.cqut.advisorplatform.checkin.attendance.mapper;

import cn.edu.cqut.advisorplatform.checkin.attendance.entity.AttendanceWorkOrder;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AttendanceWorkOrderMapper {
  int insert(AttendanceWorkOrder workOrder);

  AttendanceWorkOrder selectById(@Param("id") Long id);

  List<AttendanceWorkOrder> selectWorkOrders(
      @Param("classCode") String classCode, @Param("status") String status);

  int review(
      @Param("id") Long id,
      @Param("status") String status,
      @Param("reviewerId") Long reviewerId,
      @Param("reviewNote") String reviewNote);
}
