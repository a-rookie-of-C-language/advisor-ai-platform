package cn.edu.cqut.advisorplatform.checkin.service.impl;

import cn.edu.cqut.advisorplatform.checkin.constant.CheckInConstant;
import cn.edu.cqut.advisorplatform.checkin.mapper.StudentCheckInRecordMapper;
import cn.edu.cqut.advisorplatform.checkin.record.entity.StudentCheckInRecord;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.checkin.service.CheckInService;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CheckInServiceImpl implements CheckInService {

    private final StudentCheckInRecordMapper mapper;

    /**
     * 统计学生的打卡记录
     */
    @Override
    public PageResultVO<CheckInRecordVO> listCheckInRecords(UserPrincipal userPrincipal, Long studentId, LocalDate begin, LocalDate end, Integer page, Integer pageSize) {
        /**
         * 增加学生权限（目前UserPrincipal没有学生词条，后期根据词条动态更改下面代码）
         */
        Long queryStudentId = studentId;

        boolean canQueryAll = userPrincipal.getRole().name().equals("ADMIN")
            || userPrincipal.getRole().name().equals("ADVISOR")
            || userPrincipal.getRole().name().equals("EXPERT");

        if(!canQueryAll){
            Long currentUserId = userPrincipal.getId();

            if(studentId != null && !studentId.equals(currentUserId)){
                throw new BadRequestException("无权查询其他学生的打卡记录");
            }

            queryStudentId = currentUserId;
        }
        /**
         * 传入某个参数就查询该参数下数据
         */
        if(begin == null && end != null ){
            throw new BadRequestException("开始日期不能为空");
        }

        if(begin == null){
            begin = LocalDate.now();
        }

        if(end == null){
            end = begin;
        }

        if(begin.isAfter(end)){
            throw new BadRequestException("开始日期不能晚于结束日期");
        }

        if(page == null || page < 1){
            page = 1;
        }

        if(pageSize == null || pageSize < 10){
            pageSize = 10;
        }

        int offset = (page - 1) * pageSize;

        Long total = mapper.countCheckInRecords(queryStudentId,begin,end);

        List<CheckInRecordVO> records = mapper.selectCheckInRecords(queryStudentId,begin,end,pageSize,offset);

        return new PageResultVO<>(total,records);
    }

    /**
     * 学生打卡
     */
    @Override
    public String studentCheckIn(Long studentId) {

        if(studentId == null){
            throw new BadRequestException("学生ID不能为空");
        }

        StudentCheckInRecord recordDTO = new StudentCheckInRecord(null,studentId,LocalDate.now(),true, LocalDateTime.now(),null,null);

        Boolean checkin = mapper.ifStudentCheckIn(recordDTO);

        if(Boolean.TRUE.equals(checkin)){
            return CheckInConstant.ALREADY_CHECKED_IN;
        }

        if(Boolean.FALSE.equals(checkin)) {
            throw new BadRequestException("打卡记录状态异常，请联系管理员处理");
        }

        int rows = mapper.studentCheckIn(recordDTO);

        if(rows == 1){
            return CheckInConstant.CHECK_IN_SUCCESS;
        }

        return CheckInConstant.ALREADY_CHECKED_IN;
    }

    /**
     * 查询学生今日打卡
     */
    //@Override
    //public CheckInTodayRecords getTodayCheckIn(Long studentId) {
    //    LocalDate checkDate = LocalDate.now();
    //    CheckInTodayRecords records = mapper.selectTodayRecords(studentId,checkDate);
    //    if(records == null){
    //        records = new CheckInTodayRecords(studentId,checkDate,false,null);
    //    }
    //    return records;
    //}
}
