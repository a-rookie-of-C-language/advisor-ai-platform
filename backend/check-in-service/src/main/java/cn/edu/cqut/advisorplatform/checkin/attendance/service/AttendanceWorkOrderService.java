package cn.edu.cqut.advisorplatform.checkin.attendance.service;

import cn.edu.cqut.advisorplatform.checkin.attendance.dto.CreateWorkOrderRequest;
import cn.edu.cqut.advisorplatform.checkin.attendance.dto.ReviewWorkOrderRequest;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.AttendanceWorkOrderVO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.util.List;

public interface AttendanceWorkOrderService {
  AttendanceWorkOrderVO create(UserPrincipal userPrincipal, CreateWorkOrderRequest request);

  List<AttendanceWorkOrderVO> list(UserPrincipal userPrincipal, String classCode, String status);

  AttendanceWorkOrderVO review(
      UserPrincipal userPrincipal, Long workOrderId, ReviewWorkOrderRequest request);
}
