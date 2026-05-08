package cn.edu.cqut.advisorplatform.checkin.mapper;

import cn.edu.cqut.advisorplatform.checkin.annotation.AutoFill;
import cn.edu.cqut.advisorplatform.checkin.enums.OperationType;
import cn.edu.cqut.advisorplatform.checkin.record.entity.StudentCheckInRecord;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.springframework.security.core.parameters.P;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface StudentCheckInRecordMapper {

    /**
     * 统计学生的打卡记录，分页查询
     */
    List<CheckInRecordVO> selectCheckInRecords(@Param("studentId") Long studentId,
                                               @Param("beginDate") LocalDate begin,
                                               @Param("endDate") LocalDate end,
                                               @Param("pageSize") Integer pageSize,
                                               @Param("offset") int offset);

    /**
     * 统计总数
     */
    Long countCheckInRecords(
        @Param("studentId") Long studentId,
        @Param("beginDate") LocalDate begin,
        @Param("endDate") LocalDate end
    );

    /**
     * 查询某个学生今日是否打卡
     */
    Boolean ifStudentCheckIn(StudentCheckInRecord dto);

    /**
     * 进行学生打卡
     */
    @AutoFill(value = OperationType.INSERT)
    int studentCheckIn(StudentCheckInRecord dto);

    /**
     * 查询今日打卡结果
     */
    //CheckInTodayRecords selectTodayRecords(@Param("studentId") Long studentId,
    //                                       @Param("checkDate") LocalDate checkDate);
}
