package cn.edu.cqut.advisorplatform.checkin.controller;

import cn.edu.cqut.advisorplatform.checkin.record.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.checkin.service.CheckInService;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/check-in")
@RequiredArgsConstructor
public class CheckInController {

    private final CheckInService checkInService;

    /**
     * 学生打卡
     */
    @PostMapping("/student")
    public ApiResponseDTO<String> studentCheckIn(@AuthenticationPrincipal UserPrincipal userPrincipal){
        //需要确认 userPrincipal.getId() 到底是不是学生 id，不是后面再改
        log.info("{}号学生打卡",userPrincipal.getId());
        return ApiResponseDTO.success(checkInService.studentCheckIn(userPrincipal.getId()));
    }

    /**
     * 查询学生打卡记录
     * @param studentId
     * @param begin
     * @param end
     * @param page
     * @param pageSize
     * @return
     */
    @GetMapping("/records")
    public ApiResponseDTO<PageResultVO<CheckInRecordVO>> listCheckInRecords(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                                                            @RequestParam (required = false) Long studentId,
                                                                            @RequestParam (required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate begin,
                                                                            @RequestParam (required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end,
                                                                            @RequestParam (defaultValue = "1") Integer page,
                                                                            @RequestParam (defaultValue = "10") Integer pageSize){
        log.info("统计学生的打卡记录,查询{},{},{},页数为{}，每页{}个",studentId,begin,end,page,pageSize);
        return ApiResponseDTO.success(checkInService.listCheckInRecords(userPrincipal,studentId,begin,end,page,pageSize));
    }

    /**
     * 查看学生今日打卡情况
     */
    //@GetMapping("/today")
    //public ApiResponseDTO<CheckInTodayRecords> getTodayCheckIn(@RequestParam Long studentId){
    //    log.info("查询{}号学生今日打卡情况，{}",studentId, LocalDate.now());
    //    return ApiResponseDTO.success(checkInService.getTodayCheckIn(studentId));
    //}
}
