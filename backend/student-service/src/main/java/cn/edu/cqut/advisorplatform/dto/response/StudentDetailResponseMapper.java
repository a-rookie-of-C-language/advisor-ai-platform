package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.enums.InfoCompleteness;
import cn.edu.cqut.advisorplatform.enums.RiskLevel;

class StudentDetailResponseMapper {

  private StudentDetailResponseMapper() {}

  static StudentDetailResponse fromEntity(StudentProfile entity) {
    StudentDetailResponse response = new StudentDetailResponse();
    response.setId(entity.getId());
    response.setStudentNo(entity.getStudentNo());
    response.setName(entity.getName());
    response.setGender(entity.getGender());
    response.setGenderText(genderText(entity.getGender()));
    response.setGrade(entity.getGrade());
    response.setMajor(entity.getMajor());
    response.setClassCode(entity.getClassCode());
    response.setCounselorNo(entity.getCounselorNo());
    response.setPhone(entity.getPhone());
    response.setEmail(entity.getEmail());
    response.setDormitory(entity.getDormitory());
    response.setEmergencyContact(entity.getEmergencyContact());
    response.setInfoCompleteness(entity.getInfoCompleteness());
    InfoCompleteness ic = infoCompleteness(entity.getInfoCompleteness());
    response.setInfoCompletenessText(ic.getDescription());
    response.setRiskLevel(entity.getRiskLevel());
    RiskLevel rl = riskLevel(entity.getRiskLevel());
    response.setRiskLevelText(rl.getDescription());
    response.setCreatedAt(entity.getCreatedAt());
    response.setUpdatedAt(entity.getUpdatedAt());
    return response;
  }

  private static String genderText(Integer gender) {
    if (gender == null) {
      return "未知";
    }
    return gender == 1 ? "男" : "女";
  }

  private static InfoCompleteness infoCompleteness(Integer code) {
    if (code == null) {
      return InfoCompleteness.COMPLETE;
    }
    return InfoCompleteness.fromCode(code);
  }

  private static RiskLevel riskLevel(Integer code) {
    if (code == null) {
      return RiskLevel.NORMAL;
    }
    return RiskLevel.fromCode(code);
  }
}
