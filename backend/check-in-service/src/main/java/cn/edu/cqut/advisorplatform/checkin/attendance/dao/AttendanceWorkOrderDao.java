package cn.edu.cqut.advisorplatform.checkin.attendance.dao;

import cn.edu.cqut.advisorplatform.checkin.attendance.entity.AttendanceWorkOrder;
import cn.edu.cqut.advisorplatform.checkin.attendance.mapper.AttendanceWorkOrderMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AttendanceWorkOrderDao {
  private final AttendanceWorkOrderMapper mapper;

  public int insert(AttendanceWorkOrder workOrder) {
    return mapper.insert(workOrder);
  }

  public AttendanceWorkOrder findById(Long id) {
    return mapper.selectById(id);
  }

  public List<AttendanceWorkOrder> findWorkOrders(String classCode, String status) {
    return mapper.selectWorkOrders(classCode, status);
  }

  public int review(Long id, String status, Long reviewerId, String reviewNote) {
    return mapper.review(id, status, reviewerId, reviewNote);
  }
}
