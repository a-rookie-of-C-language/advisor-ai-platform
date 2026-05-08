package cn.edu.cqut.advisorplatform.checkin.service;

import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;

import java.time.LocalDate;

public interface CheckInService {

    /**
     * 统计学生的打卡记录
     */
    PageResultVO<CheckInRecordVO> listCheckInRecords(UserPrincipal userPrincipal, Long studentId, LocalDate begin, LocalDate end, Integer page, Integer pageSize);

    /**
     * 学生打卡
     */
    String studentCheckIn(Long studentId);

    /**
     * 查询学生今日打卡情况
     */
     //CheckInTodayRecords getTodayCheckIn(Long studentId);
}
