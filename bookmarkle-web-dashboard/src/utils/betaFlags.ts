/**
 * 베타 기능 플래그 관리
 * 환경 변수와 로컬 설정을 통해 베타 기능들을 제어합니다.
 */

// 베타 종료일 (정식 오픈 예정일) - 미정
export const BETA_END_DATE = new Date("2099-12-31"); // 베타 기간 미정, 매우 먼 미래로 설정

// 환경 변수 기반 베타 플래그들
export const BETA_FLAGS = {
  // 베타 모드 여부 (true면 베타 모드, false면 정식 오픈)
  IS_BETA: import.meta.env.VITE_IS_BETA === "true",

  // 구독 알림 배너 표시 여부 (베타가 아닐 때만 적용, 정식 오픈 시 구독 안내)
  SHOW_SUBSCRIPTION_BANNER:
    import.meta.env.VITE_SHOW_SUBSCRIPTION_BANNER === "true",

  // 구독 알림 모달 표시 여부 (베타가 아닐 때만 적용, 정식 오픈 시 구독 안내)
  SHOW_SUBSCRIPTION_MODAL:
    import.meta.env.VITE_SHOW_SUBSCRIPTION_MODAL === "true",

  // 얼리유저 혜택 표시 여부 (베타가 아닐 때만 적용)
  SHOW_EARLY_USER_BENEFITS:
    import.meta.env.VITE_SHOW_EARLY_USER_BENEFITS === "true",
} as const;

// 디버깅: 환경 변수 값 확인
if (typeof window !== "undefined") {
  console.log("[BetaFlags] 환경 변수:", {
    VITE_IS_BETA: import.meta.env.VITE_IS_BETA,
    VITE_SHOW_SUBSCRIPTION_BANNER: import.meta.env
      .VITE_SHOW_SUBSCRIPTION_BANNER,
    VITE_SHOW_SUBSCRIPTION_MODAL: import.meta.env.VITE_SHOW_SUBSCRIPTION_MODAL,
    VITE_SHOW_EARLY_USER_BENEFITS: import.meta.env
      .VITE_SHOW_EARLY_USER_BENEFITS,
  });
  console.log("[BetaFlags] 플래그 값:", BETA_FLAGS);
}

// 로컬 스토리지 키들
export const BETA_STORAGE_KEYS = {
  SUBSCRIPTION_BANNER_DISMISSED: "subscriptionBannerDismissed",
  SUBSCRIPTION_MODAL_SHOWN: "subscriptionModalShown",
  BANNER_DISMISSED: "betaBannerDismissed", // 하위 호환성 유지
  MODAL_SHOWN: "betaModalShown", // 하위 호환성 유지
} as const;

// 베타 기능 상태 확인 함수들
export const betaUtils = {
  /**
   * 구독 알림 배너를 표시할지 여부 확인
   * 베타 모드일 때는 항상 false 반환
   * 베타가 아닐 때만 VITE_SHOW_SUBSCRIPTION_BANNER 플래그 적용
   */
  shouldShowBanner(): boolean {
    // 베타 모드면 구독 배너 숨김 (베타일 때는 이 플래그 무시)
    if (BETA_FLAGS.IS_BETA) {
      console.log("[BetaFlags] 배너 숨김: 베타 모드 활성화됨");
      return false;
    }

    // 베타가 아닐 때만 플래그 체크
    if (!BETA_FLAGS.SHOW_SUBSCRIPTION_BANNER) {
      console.log(
        "[BetaFlags] 배너 숨김: VITE_SHOW_SUBSCRIPTION_BANNER가 false"
      );
      return false;
    }

    const dismissed = localStorage.getItem(
      BETA_STORAGE_KEYS.SUBSCRIPTION_BANNER_DISMISSED
    );
    const oldDismissed = localStorage.getItem(
      BETA_STORAGE_KEYS.BANNER_DISMISSED
    ); // 하위 호환성

    const shouldShow = dismissed !== "true" && oldDismissed !== "true";
    console.log("[BetaFlags] 배너 표시 여부:", {
      IS_BETA: BETA_FLAGS.IS_BETA,
      SHOW_SUBSCRIPTION_BANNER: BETA_FLAGS.SHOW_SUBSCRIPTION_BANNER,
      dismissed,
      oldDismissed,
      shouldShow,
    });

    return shouldShow;
  },

  /**
   * 구독 알림 모달을 표시할지 여부 확인
   * 베타 모드일 때는 항상 false 반환
   * 베타가 아닐 때만 VITE_SHOW_SUBSCRIPTION_MODAL 플래그 적용
   */
  shouldShowModal(): boolean {
    // 베타 모드면 구독 모달 숨김 (베타일 때는 이 플래그 무시)
    if (BETA_FLAGS.IS_BETA) {
      console.log("[BetaFlags] 모달 숨김: 베타 모드 활성화됨");
      return false;
    }

    // 베타가 아닐 때만 플래그 체크
    if (!BETA_FLAGS.SHOW_SUBSCRIPTION_MODAL) {
      console.log(
        "[BetaFlags] 모달 숨김: VITE_SHOW_SUBSCRIPTION_MODAL이 false"
      );
      return false;
    }

    const shown = localStorage.getItem(
      BETA_STORAGE_KEYS.SUBSCRIPTION_MODAL_SHOWN
    );
    const oldShown = localStorage.getItem(BETA_STORAGE_KEYS.MODAL_SHOWN); // 하위 호환성

    const shouldShow = shown !== "true" && oldShown !== "true";
    console.log("[BetaFlags] 모달 표시 여부:", {
      IS_BETA: BETA_FLAGS.IS_BETA,
      SHOW_SUBSCRIPTION_MODAL: BETA_FLAGS.SHOW_SUBSCRIPTION_MODAL,
      shown,
      oldShown,
      shouldShow,
    });

    return shouldShow;
  },

  /**
   * 구독 알림 배너 닫기
   */
  dismissBanner(): void {
    localStorage.setItem(
      BETA_STORAGE_KEYS.SUBSCRIPTION_BANNER_DISMISSED,
      "true"
    );
    localStorage.setItem(BETA_STORAGE_KEYS.BANNER_DISMISSED, "true"); // 하위 호환성
  },

  /**
   * 구독 알림 모달 표시 완료 기록
   */
  markModalShown(): void {
    localStorage.setItem(BETA_STORAGE_KEYS.SUBSCRIPTION_MODAL_SHOWN, "true");
    localStorage.setItem(BETA_STORAGE_KEYS.MODAL_SHOWN, "true"); // 하위 호환성
  },

  /**
   * 얼리유저 혜택 표시 여부 확인
   * 베타 모드일 때는 항상 false 반환
   * 베타가 아닐 때만 VITE_SHOW_EARLY_USER_BENEFITS 플래그 적용
   */
  shouldShowEarlyUserBenefits(): boolean {
    // 베타 모드면 얼리유저 혜택 숨김 (베타일 때는 이 플래그 무시)
    if (BETA_FLAGS.IS_BETA) return false;

    // 베타가 아닐 때만 플래그 체크
    return BETA_FLAGS.SHOW_EARLY_USER_BENEFITS;
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
          localStorage.getItem(
            BETA_STORAGE_KEYS.SUBSCRIPTION_BANNER_DISMISSED
          ) === "true" ||
          localStorage.getItem(BETA_STORAGE_KEYS.BANNER_DISMISSED) === "true",
        modalShown:
          localStorage.getItem(BETA_STORAGE_KEYS.SUBSCRIPTION_MODAL_SHOWN) ===
            "true" ||
          localStorage.getItem(BETA_STORAGE_KEYS.MODAL_SHOWN) === "true",
      },
      betaEndDate: BETA_END_DATE,
    };
  },
};

// 베타 기간 여부 확인 (환경 변수 우선, 없으면 날짜 기반)
export const isBetaPeriod = (): boolean => {
  // 환경 변수가 설정되어 있으면 환경 변수 값 사용
  if (import.meta.env.VITE_IS_BETA !== undefined) {
    return import.meta.env.VITE_IS_BETA === "true";
  }
  // 환경 변수가 없으면 날짜 기반 체크
  return new Date() < BETA_END_DATE;
};
