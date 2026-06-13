import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  db,
  getUserNotificationSettings,
  setUserNotificationSettings,
  type NotificationSettings,
} from "../../firebase";

const LS_PRIMARY = "notifications";
const LS_LEGACY = "bookmarkNotifications";

const readInitial = (): boolean => {
  try {
    const saved = localStorage.getItem(LS_PRIMARY);
    if (saved !== null) return JSON.parse(saved);
    const legacy = localStorage.getItem(LS_LEGACY);
    if (legacy !== null) return JSON.parse(legacy);
  } catch {
    /* no-op */
  }
  return true;
};

const persistLocal = (value: boolean) => {
  try {
    localStorage.setItem(LS_PRIMARY, JSON.stringify(value));
    localStorage.setItem(LS_LEGACY, JSON.stringify(value));
  } catch {
    /* no-op */
  }
};

const resolveValueFrom = (
  data: Record<string, unknown> | NotificationSettings
): boolean => {
  if ("notifications" in data && data.notifications !== undefined) {
    return Boolean(data.notifications);
  }
  if ("bookmarkNotifications" in data && data.bookmarkNotifications !== undefined) {
    return Boolean(data.bookmarkNotifications);
  }
  return true;
};

// 알림 활성화 토글 상태와 핸들러를 제공.
// - Firestore (users/{uid}/settings/main) 실시간 구독
// - 다른 컴포넌트와의 동기화를 위해 CustomEvent 송수신
// - localStorage 캐싱 (오프라인 초기값 + 다른 탭 호환)
export function useNotificationSetting(uid: string | undefined) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean>(readInitial);

  // Firestore 구독
  useEffect(() => {
    if (!uid) return;

    const settingsRef = doc(db, "users", uid, "settings", "main");
    const unsubscribe = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const value = resolveValueFrom(snap.data() as Record<string, unknown>);
          setEnabled(value);
          persistLocal(value);
        } else {
          setEnabled(true);
          persistLocal(true);
        }
      },
      (error) => {
        const err = error as { code?: string; message?: string };
        // 권한 오류 시 리스너 정리 (로그아웃 중일 수 있음)
        if (
          err?.code === "permission-denied" ||
          err?.code === "unauthenticated"
        ) {
          try {
            unsubscribe();
          } catch {
            /* no-op */
          }
          return;
        }

        if (import.meta.env.DEV) {
          console.error("알림 설정 실시간 동기화 실패:", error);
        }
        // 폴백: 1회 read로 시도
        getUserNotificationSettings(uid)
          .then((settings: NotificationSettings) => {
            const value =
              settings.notifications !== undefined
                ? Boolean(settings.notifications)
                : settings.bookmarkNotifications;
            if (value !== undefined) {
              setEnabled(Boolean(value));
              persistLocal(Boolean(value));
            }
          })
          .catch((loadErr: unknown) => {
            if (import.meta.env.DEV) {
              console.error("알림 설정 로드 실패:", loadErr);
            }
          });
      }
    );

    return () => unsubscribe();
  }, [uid]);

  // CustomEvent 송수신 (다른 컴포넌트와의 동기화)
  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") {
        setEnabled(detail.enabled);
      }
    };

    window.addEventListener("notificationsChanged", handle);
    window.addEventListener("bookmarkNotificationsChanged", handle);

    return () => {
      window.removeEventListener("notificationsChanged", handle);
      window.removeEventListener("bookmarkNotificationsChanged", handle);
    };
  }, []);

  const toggle = async () => {
    if (!uid) return;

    const next = !enabled;
    setEnabled(next);
    persistLocal(next);

    try {
      await setUserNotificationSettings(uid, {
        notifications: next,
        bookmarkNotifications: next,
      });
    } catch (error) {
      console.error("알림 설정 저장 실패:", error);
      // 롤백
      setEnabled(!next);
      persistLocal(!next);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("notificationsChanged", { detail: { enabled: next } })
    );
    window.dispatchEvent(
      new CustomEvent("bookmarkNotificationsChanged", {
        detail: { enabled: next },
      })
    );

    toast.success(
      `${t("notifications.bookmarkNotifications")} ${
        next ? t("notifications.enable") : t("notifications.disable")
      }`
    );
  };

  return { enabled, toggle };
}
