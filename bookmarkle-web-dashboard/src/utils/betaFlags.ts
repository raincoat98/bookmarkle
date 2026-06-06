/**
 * 베타/구독 기능 플래그 관리
 *
 * 플래그는 Firestore `config/featureFlags` 문서에서 관리되며,
 * 관리자 페이지의 "구독 기능 설정" 탭에서 변경할 수 있습니다.
 * 로컬 dismiss 상태는 localStorage에 저장됩니다.
 */

import { getCurrentFlags } from "../stores/featureFlagsStore";

// 베타 종료일 (정식 오픈 예정일) - 미정
export const BETA_END_DATE = new Date("2099-12-31");

// 동기 호환 객체 (legacy 코드용 — getter로 항상 현재 값 반환)
export const BETA_FLAGS = {
  get IS_BETA() {
    return getCurrentFlags().IS_BETA;
  },
  get SHOW_SUBSCRIPTION_BANNER() {
    return getCurrentFlags().SHOW_SUBSCRIPTION_BANNER;
  },
  get SHOW_SUBSCRIPTION_MODAL() {
    return getCurrentFlags().SHOW_SUBSCRIPTION_MODAL;
  },
  get SHOW_EARLY_USER_BENEFITS() {
    return getCurrentFlags().SHOW_EARLY_USER_BENEFITS;
  },
};

// 로컬 스토리지 키들 (dismiss 상태 저장용)
export const BETA_STORAGE_KEYS = {
  SUBSCRIPTION_BANNER_DISMISSED: "subscriptionBannerDismissed",
  SUBSCRIPTION_MODAL_SHOWN: "subscriptionModalShown",
  BANNER_DISMISSED: "betaBannerDismissed",
  MODAL_SHOWN: "betaModalShown",
} as const;

export const betaUtils = {
  shouldShowBanner(): boolean {
    const flags = getCurrentFlags();
    if (flags.IS_BETA) return false;
    if (!flags.SHOW_SUBSCRIPTION_BANNER) return false;

    const dismissed = localStorage.getItem(
      BETA_STORAGE_KEYS.SUBSCRIPTION_BANNER_DISMISSED
    );
    const oldDismissed = localStorage.getItem(BETA_STORAGE_KEYS.BANNER_DISMISSED);
    return dismissed !== "true" && oldDismissed !== "true";
  },

  shouldShowModal(): boolean {
    const flags = getCurrentFlags();
    if (flags.IS_BETA) return false;
    if (!flags.SHOW_SUBSCRIPTION_MODAL) return false;

    const shown = localStorage.getItem(
      BETA_STORAGE_KEYS.SUBSCRIPTION_MODAL_SHOWN
    );
    const oldShown = localStorage.getItem(BETA_STORAGE_KEYS.MODAL_SHOWN);
    return shown !== "true" && oldShown !== "true";
  },

  dismissBanner(): void {
    localStorage.setItem(BETA_STORAGE_KEYS.SUBSCRIPTION_BANNER_DISMISSED, "true");
    localStorage.setItem(BETA_STORAGE_KEYS.BANNER_DISMISSED, "true");
  },

  markModalShown(): void {
    localStorage.setItem(BETA_STORAGE_KEYS.SUBSCRIPTION_MODAL_SHOWN, "true");
    localStorage.setItem(BETA_STORAGE_KEYS.MODAL_SHOWN, "true");
  },

  shouldShowEarlyUserBenefits(): boolean {
    const flags = getCurrentFlags();
    if (flags.IS_BETA) return false;
    return flags.SHOW_EARLY_USER_BENEFITS;
  },

  resetBetaSettings(): void {
    Object.values(BETA_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  getBetaStatus() {
    return {
      flags: { ...getCurrentFlags() },
      storage: {
        bannerDismissed:
          localStorage.getItem(BETA_STORAGE_KEYS.SUBSCRIPTION_BANNER_DISMISSED) ===
            "true" ||
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

export const isBetaPeriod = (): boolean => getCurrentFlags().IS_BETA;
