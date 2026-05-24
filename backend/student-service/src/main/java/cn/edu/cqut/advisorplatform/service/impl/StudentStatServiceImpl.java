package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.StudentProfileDao;
import cn.edu.cqut.advisorplatform.dao.StudentTaskDao;
import cn.edu.cqut.advisorplatform.dto.response.StatOverviewResponse;
import cn.edu.cqut.advisorplatform.enums.TaskStatus;
import cn.edu.cqut.advisorplatform.service.StudentStatService;
import org.springframework.stereotype.Service;

@Service
public class StudentStatServiceImpl implements StudentStatService {

  private final StudentProfileDao studentProfileDao;
  private final StudentTaskDao taskDao;

  public StudentStatServiceImpl(StudentProfileDao studentProfileDao, StudentTaskDao taskDao) {
    this.studentProfileDao = studentProfileDao;
    this.taskDao = taskDao;
  }

  @Override
  public StatOverviewResponse getOverview() {
    StatOverviewResponse response = new StatOverviewResponse();

    long totalStudents = studentProfileDao.countAllActive();
    response.setTotalStudents(totalStudents);
    response.setTotalProfiles(totalStudents);

    long missingInfoCount = countMissingInfo();
    response.setMissingInfoCount(missingInfoCount);

    long totalTasks = taskDao.count();
    response.setTotalTasks(totalTasks);

    long pendingTasks = taskDao.countByAssigneeNoAndStatus(null, TaskStatus.PENDING.getCode());
    response.setPendingTasks(pendingTasks);

    long processingTasks =
        taskDao.countByAssigneeNoAndStatus(null, TaskStatus.PROCESSING.getCode());
    response.setProcessingTasks(processingTasks);

    return response;
  }

  @Override
  public long countMissingInfo() {
    return studentProfileDao.countByInfoMissing();
  }
}
