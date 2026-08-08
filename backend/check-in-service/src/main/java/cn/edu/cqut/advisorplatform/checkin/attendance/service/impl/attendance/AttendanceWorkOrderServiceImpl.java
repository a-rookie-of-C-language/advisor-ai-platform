package cn.edu.cqut.advisorplatform.checkin.attendance.service.impl.attendance;

import cn.edu.cqut.advisorplatform.checkin.attendance.dao.AttendanceWorkOrderDao;
import cn.edu.cqut.advisorplatform.checkin.attendance.dao.ClassSessionDao;
import cn.edu.cqut.advisorplatform.checkin.attendance.dto.CreateWorkOrderRequest;
import cn.edu.cqut.advisorplatform.checkin.attendance.dto.ReviewWorkOrderRequest;
import cn.edu.cqut.advisorplatform.checkin.attendance.entity.AttendanceWorkOrder;
import cn.edu.cqut.advisorplatform.checkin.attendance.entity.ClassSession;
import cn.edu.cqut.advisorplatform.checkin.attendance.enums.WorkOrderStatus;
import cn.edu.cqut.advisorplatform.checkin.attendance.enums.WorkOrderType;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.AttendanceAccessSupport;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.AttendanceWorkOrderService;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.AttendanceWorkOrderVO;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AttendanceWorkOrderServiceImpl implements AttendanceWorkOrderService {
  private final AttendanceWorkOrderDao workOrderDao;
  private final ClassSessionDao classSessionDao;
  private final AttendanceAccessSupport accessSupport;
  private final AttendanceMapperSupport mapperSupport;

  @Override
  @Transactional
  public AttendanceWorkOrderVO create(UserPrincipal userPrincipal, CreateWorkOrderRequest request) {
    String monitorClassCode = accessSupport.requireMonitorClassCode(userPrincipal);
    ClassSession session = requireSession(request.getSessionId());
    accessSupport.requireSameClass(monitorClassCode, session.getClassCode());
    AttendanceWorkOrder workOrder = new AttendanceWorkOrder();
    LocalDateTime now = LocalDateTime.now();
    workOrder.setSessionId(session.getId());
    workOrder.setClassCode(session.getClassCode());
    workOrder.setType(WorkOrderType.RESCHEDULE.name());
    workOrder.setStatus(WorkOrderStatus.PENDING.name());
    workOrder.setReason(request.getReason());
    workOrder.setTargetSessionDate(request.getTargetSessionDate());
    workOrder.setTargetStartTime(request.getTargetStartTime());
    workOrder.setTargetEndTime(request.getTargetEndTime());
    workOrder.setTargetLocation(request.getTargetLocation());
    workOrder.setApplicantId(accessSupport.requireUserId(userPrincipal));
    workOrder.setCreatedAt(now);
    workOrder.setUpdatedAt(now);
    workOrderDao.insert(workOrder);
    return mapperSupport.toWorkOrderVO(workOrder);
  }

  @Override
  public List<AttendanceWorkOrderVO> list(
      UserPrincipal userPrincipal, String classCode, String status) {
    String scopedClassCode = classCode;
    if (userPrincipal.getRole() == UserRole.MONITOR) {
      scopedClassCode = accessSupport.requireMonitorClassCode(userPrincipal);
    } else {
      accessSupport.requireAnyRole(userPrincipal, UserRole.ADMIN, UserRole.ADVISOR);
    }
    return workOrderDao.findWorkOrders(scopedClassCode, status).stream()
        .map(mapperSupport::toWorkOrderVO)
        .toList();
  }

  @Override
  @Transactional
  public AttendanceWorkOrderVO review(
      UserPrincipal userPrincipal, Long workOrderId, ReviewWorkOrderRequest request) {
    accessSupport.requireAnyRole(userPrincipal, UserRole.ADMIN, UserRole.ADVISOR);
    AttendanceWorkOrder workOrder = workOrderDao.findById(workOrderId);
    if (workOrder == null) {
      throw new BadRequestException("工单不存在");
    }
    if (!WorkOrderStatus.PENDING.name().equals(workOrder.getStatus())) {
      throw new BadRequestException("当前工单状态不允许审批");
    }
    String status = normalizeReviewStatus(request.getStatus());
    Long reviewerId = accessSupport.requireUserId(userPrincipal);
    workOrderDao.review(workOrderId, status, reviewerId, request.getReviewNote());
    if (WorkOrderStatus.APPROVED.name().equals(status)) {
      classSessionDao.updateScheduleTime(
          workOrder.getSessionId(),
          workOrder.getTargetSessionDate(),
          workOrder.getTargetStartTime(),
          workOrder.getTargetEndTime(),
          workOrder.getTargetLocation());
    }
    return mapperSupport.toWorkOrderVO(workOrderDao.findById(workOrderId));
  }

  private ClassSession requireSession(Long sessionId) {
    if (sessionId == null) {
      throw new BadRequestException("课堂ID不能为空");
    }
    ClassSession session = classSessionDao.findById(sessionId);
    if (session == null) {
      throw new BadRequestException("课堂不存在");
    }
    return session;
  }

  private String normalizeReviewStatus(String status) {
    if (status == null || status.isBlank()) {
      throw new BadRequestException("审批状态不能为空");
    }
    String value = status.trim().toUpperCase();
    if (!WorkOrderStatus.APPROVED.name().equals(value)
        && !WorkOrderStatus.REJECTED.name().equals(value)) {
      throw new BadRequestException("审批状态只能为 APPROVED 或 REJECTED");
    }
    return value;
  }
}
