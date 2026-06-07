// 브라우저 알림 관련 유틸리티 함수들

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

/**
 * 브라우저 알림 권한 상태를 확인합니다
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!("Notification" in window)) {
    return { granted: false, denied: false, default: false };
  }

  const permission = Notification.permission;
  return {
    granted: permission === "granted",
    denied: permission === "denied",
    default: permission === "default",
  };
};

/**
 * 브라우저 알림 권한을 요청합니다
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.warn("이 브라우저는 알림을 지원하지 않습니다.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("알림 권한이 거부되었습니다.");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

const getServiceWorkerRegistration =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) return reg;
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  };

/**
 * 브라우저 알림을 표시합니다. PWA(Service Worker) 환경에서는 SW 경유,
 * 그 외에는 `new Notification()` 폴백을 사용합니다.
 */
export const showBrowserNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<void> => {
  if (!("Notification" in window)) {
    console.warn("이 브라우저는 알림을 지원하지 않습니다.");
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const merged: NotificationOptions = {
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "bookmarkhub-notification",
    requireInteraction: false,
    silent: false,
    ...options,
  };

  const registration = await getServiceWorkerRegistration();
  if (registration && typeof registration.showNotification === "function") {
    try {
      await registration.showNotification(title, merged);
      return;
    } catch (error) {
      console.warn("SW 알림 표시 실패, fallback 사용:", error);
    }
  }

  try {
    const notification = new Notification(title, merged);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    setTimeout(() => notification.close(), 5000);
  } catch (error) {
    console.error("알림 표시 중 오류:", error);
  }
};

const bookmarkIconMap = {
  added: "/icons/icon-192.png",
  updated: "/icons/icon-192.png",
  deleted: "/icons/icon-192.png",
} as const;

/**
 * 북마크 관련 알림을 표시합니다 (다국어 메시지는 호출 측에서 전달)
 */
export const showBookmarkNotification = async (
  type: "added" | "updated" | "deleted",
  bookmarkTitle: string,
  options: { title?: string; message?: string; bookmarkId?: string } = {}
): Promise<void> => {
  const defaultMessages = {
    added: {
      title: options.title || "새 북마크 추가됨",
      body: options.message || `"${bookmarkTitle}" 북마크가 추가되었습니다.`,
    },
    updated: {
      title: options.title || "북마크 수정됨",
      body: options.message || `"${bookmarkTitle}" 북마크가 수정되었습니다.`,
    },
    deleted: {
      title: options.title || "북마크 삭제됨",
      body: options.message || `"${bookmarkTitle}" 북마크가 삭제되었습니다.`,
    },
  };

  const config = defaultMessages[type];
  const tag = options.bookmarkId
    ? `bookmark-${type}-${options.bookmarkId}`
    : `bookmark-${type}`;

  await showBrowserNotification(config.title, {
    body: config.body,
    icon: bookmarkIconMap[type],
    tag,
  });
};

/**
 * 테스트 알림을 표시합니다
 */
export const showTestNotification = async (
  title?: string,
  message?: string
): Promise<void> => {
  await showBrowserNotification(title || "테스트 알림", {
    body: message || "브라우저 알림이 정상적으로 작동합니다!",
    icon: "/icons/icon-192.png",
    tag: "bookmarkhub-test",
  });
};
