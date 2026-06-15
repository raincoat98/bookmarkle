// 정식 오픈 안내 배너/팝업의 사용자별 dismiss 상태 (localStorage)

const KEY_MODAL_DISMISSED = "announcementModalDismissed";
const KEY_BANNER_DISMISSED = "announcementBannerDismissed";

const safeGet = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

const safeSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* no-op */
  }
};

const safeRemove = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* no-op */
  }
};

export const announcementStorage = {
  isModalDismissed(): boolean {
    return safeGet(KEY_MODAL_DISMISSED);
  },
  dismissModal(): void {
    safeSet(KEY_MODAL_DISMISSED, "true");
  },
  resetModal(): void {
    safeRemove(KEY_MODAL_DISMISSED);
  },

  isBannerDismissed(): boolean {
    return safeGet(KEY_BANNER_DISMISSED);
  },
  dismissBanner(): void {
    safeSet(KEY_BANNER_DISMISSED, "true");
  },
  resetBanner(): void {
    safeRemove(KEY_BANNER_DISMISSED);
  },

  resetAll(): void {
    safeRemove(KEY_MODAL_DISMISSED);
    safeRemove(KEY_BANNER_DISMISSED);
  },
};
