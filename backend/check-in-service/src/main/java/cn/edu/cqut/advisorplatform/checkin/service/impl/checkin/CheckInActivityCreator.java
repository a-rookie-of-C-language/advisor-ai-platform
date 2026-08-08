package cn.edu.cqut.advisorplatform.checkin.service.impl.checkin;

import cn.edu.cqut.advisorplatform.checkin.client.TeacherServiceClient;
import cn.edu.cqut.advisorplatform.checkin.dao.CheckInDao;
import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInActivityVO;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

class CheckInActivityCreator {
  private static final String ACTIVE = "ACTIVE";

  private final CheckInDao checkInDao;
  private final TeacherServiceClient teacherServiceClient;
  private final CheckInServiceSupport checkInServiceSupport;
  private final CheckInEntityFactory entityFactory;

  CheckInActivityCreator(
      CheckInDao checkInDao,
      TeacherServiceClient teacherServiceClient,
      CheckInServiceSupport checkInServiceSupport,
      CheckInEntityFactory entityFactory) {
    this.checkInDao = checkInDao;
    this.teacherServiceClient = teacherServiceClient;
    this.checkInServiceSupport = checkInServiceSupport;
    this.entityFactory = entityFactory;
  }

  CheckInActivityVO create(UserPrincipal userPrincipal, CreateCheckInActivityRequest request) {
    checkInServiceSupport.requireRole(userPrincipal, UserRole.TEACHER);
    checkInServiceSupport.validateActivityRequest(request);
    var identity = checkInServiceSupport.requireIdentity(userPrincipal.getId(), "TEACHER");
    var teaching =
        teacherServiceClient.getTeachingClasses(identity.getIdentityNo(), request.getCourseId());
    Set<String> requestedClassCodes =
        checkInServiceSupport.normalizeClassCodes(request.getClassCodes());
    if (!new java.util.LinkedHashSet<>(teaching.getClassCodes()).containsAll(requestedClassCodes)) {
      throw new ForbiddenException("只能为本人授课班级发起打卡");
    }

    String checkInId = UUID.randomUUID().toString();
    LocalDateTime now = LocalDateTime.now();
    CheckInActivity activity =
        entityFactory.createActivity(
            checkInId,
            userPrincipal.getId(),
            identity.getIdentityNo(),
            teaching,
            request,
            checkInServiceSupport.resolveTitle(request.getTitle(), teaching.getCourseName()),
            ACTIVE,
            now);
    checkInDao.insertActivity(activity);
    requestedClassCodes.forEach(classCode -> checkInDao.insertActivityClass(checkInId, classCode));
    return checkInServiceSupport.toActivityVO(activity, List.copyOf(requestedClassCodes));
  }
}
