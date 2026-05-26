package cn.edu.cqut.advisorplatform.entity;

import cn.edu.cqut.advisorplatform.enums.InfoCompleteness;

class StudentProfileCompleteness {

  private StudentProfileCompleteness() {}

  static boolean isInfoMissing(
      String phone, String email, String dormitory, String emergencyContact) {
    return !hasText(phone) && !hasText(email) && !hasText(dormitory) && !hasText(emergencyContact);
  }

  static InfoCompleteness calculate(
      String phone, String email, String dormitory, String emergencyContact) {
    int filledCount = 0;
    if (hasText(phone)) {
      filledCount++;
    }
    if (hasText(email)) {
      filledCount++;
    }
    if (hasText(dormitory)) {
      filledCount++;
    }
    if (hasText(emergencyContact)) {
      filledCount++;
    }

    if (filledCount == 0) {
      return InfoCompleteness.SEVERE_MISSING;
    } else if (filledCount <= 2) {
      return InfoCompleteness.PARTIAL_MISSING;
    } else {
      return InfoCompleteness.COMPLETE;
    }
  }

  private static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
