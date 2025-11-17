/**
 * 베타 기능 플래그 관리
 * 환경 변수와 로컬 설정을 통해 베타 기능들을 제어합니다.
 */

// 베타 종료일 (정식 오픈 예정일)
export const BETA_END_DATE = new Date("2025-12-31"); // 실제 날짜로 변경 필요

// 환경 변수 기반 베타 플래그들
export const BETA_FLAGS = {
  // 베타 배너 표시 여부
  SHOW_BETA_BANNER: import.meta.env.VITE_SHOW_BETA_BANNER !== "false",

  // 베타 공지 모달 표시 여부 (첫 로그인 시)
  SHOW_BETA_MODAL: import.meta.env.VITE_SHOW_BETA_MODAL !== "false",

  // 얼리유저 혜택 표시 여부
  SHOW_EARLY_USER_BENEFITS:
    import.meta.env.VITE_SHOW_EARLY_USER_BENEFITS !== "false",

  // 프리미엄 기능 Soft Lock 예고 표시 여부
  SHOW_PREMIUM_PREVIEW: import.meta.env.VITE_SHOW_PREMIUM_PREVIEW !== "false",

  // 설정에서 베타 정보 표시 여부
  SHOW_BETA_SETTINGS: import.meta.env.VITE_SHOW_BETA_SETTINGS !== "false",

  // 베타 피드백 기능 활성화 여부
  ENABLE_BETA_FEEDBACK: import.meta.env.VITE_ENABLE_BETA_FEEDBACK !== "false",
} as const;

// 로컬 스토리지 키들
export const BETA_STORAGE_KEYS = {
  BANNER_DISMISSED: "betaBannerDismissed",
  MODAL_SHOWN: "betaModalShown",
  FEEDBACK_SENT: "betaFeedbackSent",
} as const;

// 베타 기능 상태 확인 함수들
export const betaUtils = {
  /**
   * 베타 배너를 표시할지 여부 확인
   */
  shouldShowBanner(): boolean {
    if (!BETA_FLAGS.SHOW_BETA_BANNER) return false;

    const dismissed = localStorage.getItem(BETA_STORAGE_KEYS.BANNER_DISMISSED);
    return dismissed !== "true";
  },

  /**
   * 베타 모달을 표시할지 여부 확인
   */
  shouldShowModal(): boolean {
    if (!BETA_FLAGS.SHOW_BETA_MODAL) return false;

    const shown = localStorage.getItem(BETA_STORAGE_KEYS.MODAL_SHOWN);
    return shown !== "true";
  },

  /**
   * 베타 배너 닫기
   */
  dismissBanner(): void {
    localStorage.setItem(BETA_STORAGE_KEYS.BANNER_DISMISSED, "true");
  },

  /**
   * 베타 모달 표시 완료 기록
   */
  markModalShown(): void {
    localStorage.setItem(BETA_STORAGE_KEYS.MODAL_SHOWN, "true");
  },

  /**
   * 얼리유저 혜택 표시 여부 확인
   */
  shouldShowEarlyUserBenefits(): boolean {
    return BETA_FLAGS.SHOW_EARLY_USER_BENEFITS;
  },

  /**
   * 프리미엄 미리보기 표시 여부 확인
   */
  shouldShowPremiumPreview(): boolean {
    return BETA_FLAGS.SHOW_PREMIUM_PREVIEW;
  },

  /**
   * 설정에서 베타 정보 표시 여부 확인
   */
  shouldShowBetaSettings(): boolean {
    return BETA_FLAGS.SHOW_BETA_SETTINGS;
  },

  /**
   * 베타 피드백 기능 활성화 여부 확인
   */
  isFeedbackEnabled(): boolean {
    return BETA_FLAGS.ENABLE_BETA_FEEDBACK;
  },

  /**
   * 베타 설정 초기화 (개발/테스트용)
   */
  resetBetaSettings(): void {
    Object.values(BETA_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  /**
   * 현재 베타 상태 정보 반환
   */
  getBetaStatus() {
    return {
      flags: BETA_FLAGS,
      storage: {
        bannerDismissed:
          localStorage.getItem(BETA_STORAGE_KEYS.BANNER_DISMISSED) === "true",
        modalShown:
          localStorage.getItem(BETA_STORAGE_KEYS.MODAL_SHOWN) === "true",
        feedbackSent:
          localStorage.getItem(BETA_STORAGE_KEYS.FEEDBACK_SENT) === "true",
      },
      betaEndDate: BETA_END_DATE,
    };
  },
};

// 베타 기간 여부 확인
export const isBetaPeriod = (): boolean => {
  return new Date() < BETA_END_DATE;
};

// 정식 오픈까지 남은 일수 계산
export const getDaysUntilLaunch = (): number => {
  const now = new Date();
  const timeDiff = BETA_END_DATE.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};
