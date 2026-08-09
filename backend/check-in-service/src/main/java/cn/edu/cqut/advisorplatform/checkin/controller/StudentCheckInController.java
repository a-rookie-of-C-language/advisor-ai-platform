package cn.edu.cqut.advisorplatform.checkin.controller;

import cn.edu.cqut.advisorplatform.checkin.record.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.service.CheckInService;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 学生打卡控制器，提供学生专用的打卡接口。 与 CheckInController（教师/管理员）分离，使用 STUDENT 角色权限控制。 */
@RestController
@RequestMapping("/api/check-in/student")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class StudentCheckInController {

  private final CheckInService checkInService;

  /**
   * 学生查看可用的打卡活动列表。
   *
   * @return 可用打卡活动列表
   */
  @GetMapping("/activities/available")
  public ApiResponseDTO<List<AvailableCheckInActivityVO>> listAvailableActivities(
      @AuthenticationPrincipal UserPrincipal userPrincipal) {
    return ApiResponseDTO.success(checkInService.listAvailableActivities(userPrincipal));
  }

  /**
   * 学生执行打卡。
   *
   * @param checkInId 打卡活动ID
   * @return 打卡结果
   */
  @PostMapping("/{checkInId}")
  public ApiResponseDTO<String> studentCheckIn(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @PathVariable("checkInId") String checkInId) {
    return ApiResponseDTO.success(checkInService.studentCheckIn(userPrincipal, checkInId));
  }
}
