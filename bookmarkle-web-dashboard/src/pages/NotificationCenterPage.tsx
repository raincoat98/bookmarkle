import React, { useState, useEffect } from "react";
import { useTranslation } from "../../node_modules/react-i18next";
import toast from "react-hot-toast";
import { useAuthStore } from "../stores";
import { useNotifications } from "../hooks/useNotifications";
import { Drawer } from "../components/Drawer";
import {
  getUserNotificationSettings,
  setUserNotificationSettings,
  db,
} from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Bell,
  Check,
  Trash2,
  BookOpen,
  Edit,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotificationPermission,
  requestNotificationPermission,
  showTestNotification,
} from "../utils/browserNotifications";

export const NotificationCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    deleteAllNotifications,
  } = useNotifications(user?.uid || "");

  const getInitialNotificationsSetting = () => {
    const saved = localStorage.getItem("notifications");
    if (saved !== null) return JSON.parse(saved);
    const legacy = localStorage.getItem("bookmarkNotifications");
    if (legacy !== null) return JSON.parse(legacy);
    return true;
  };

  const getInitialSystemNotificationsSetting = (fallback: boolean) => {
    const saved = localStorage.getItem("systemNotifications");
    if (saved !== null) return JSON.parse(saved);
    return fallback;
  };

  const initialNotificationsEnabled = getInitialNotificationsSetting();
  const [notificationsEnabled, setNotificationsEnabled] = useState<
    boolean | null
  >(initialNotificationsEnabled);
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState<
    boolean | null
  >(getInitialSystemNotificationsSetting(initialNotificationsEnabled));
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState(() => getNotificationPermission());

  // Firestore에서 알림 설정 실시간 동기화
  useEffect(() => {
    if (!user?.uid) return;

    // 실시간 동기화 (onSnapshot의 첫 호출이 초기 로드 역할)
    const settingsRef = doc(db, "users", user.uid, "settings", "main");

    const unsubscribe = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const newValue =
            data.notifications !== undefined
              ? data.notifications
              : data.bookmarkNotifications !== undefined
              ? data.bookmarkNotifications
              : true;
          const systemValue =
            data.systemNotifications !== undefined
              ? data.systemNotifications
              : newValue;

          setNotificationsEnabled(newValue);
          localStorage.setItem("notifications", JSON.stringify(newValue));
          localStorage.setItem(
            "bookmarkNotifications",
            JSON.stringify(newValue)
          );

          setSystemNotificationsEnabled(newValue ? systemValue : false);
          localStorage.setItem(
            "systemNotifications",
            JSON.stringify(newValue ? systemValue : false)
          );
          setBrowserNotificationPermission(getNotificationPermission());
        } else {
          const defaultValue = true;
          setNotificationsEnabled(defaultValue);
          localStorage.setItem("notifications", JSON.stringify(defaultValue));
          localStorage.setItem(
            "bookmarkNotifications",
            JSON.stringify(defaultValue)
          );

          setSystemNotificationsEnabled(defaultValue);
          localStorage.setItem(
            "systemNotifications",
            JSON.stringify(defaultValue)
          );
          setBrowserNotificationPermission(getNotificationPermission());
        }
      },
      (error) => {
        console.error("알림 설정 실시간 동기화 실패:", error);
        // 에러 발생 시 초기 로드 시도
        getUserNotificationSettings(user.uid)
          .then((settings) => {
            const fallback =
              settings.notifications !== undefined
                ? settings.notifications
                : settings.bookmarkNotifications;
            const systemFallback =
              settings.systemNotifications !== undefined
                ? settings.systemNotifications
                : fallback;

            if (fallback !== undefined) {
              setNotificationsEnabled(fallback);
              localStorage.setItem("notifications", JSON.stringify(fallback));
              localStorage.setItem(
                "bookmarkNotifications",
                JSON.stringify(fallback)
              );
            }

            if (systemFallback !== undefined) {
              const appliedSystem = fallback ? systemFallback : false;
              setSystemNotificationsEnabled(appliedSystem);
              localStorage.setItem(
                "systemNotifications",
                JSON.stringify(appliedSystem)
              );
              setBrowserNotificationPermission(getNotificationPermission());
            }
          })
          .catch((err) => {
            console.error("알림 설정 로드 실패:", err);
          });
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // 설정 페이지에서 북마크 알림 상태 변경 감지
  useEffect(() => {
    const handleNotificationsChange = (event: CustomEvent) => {
      setNotificationsEnabled(event.detail.enabled);
      if (!event.detail.enabled) {
        setSystemNotificationsEnabled(false);
        localStorage.setItem("systemNotifications", JSON.stringify(false));
      }
    };
    const handleSystemChange = (event: CustomEvent) => {
      setSystemNotificationsEnabled(event.detail.enabled);
      setBrowserNotificationPermission(getNotificationPermission());
    };

    const recordListener = handleNotificationsChange as EventListener;
    const systemListener = handleSystemChange as EventListener;

    window.addEventListener("notificationsChanged", recordListener);
    window.addEventListener("bookmarkNotificationsChanged", recordListener);
    window.addEventListener("systemNotificationsChanged", systemListener);

    return () => {
      window.removeEventListener("notificationsChanged", recordListener);
      window.removeEventListener(
        "bookmarkNotificationsChanged",
        recordListener
      );
      window.removeEventListener("systemNotificationsChanged", systemListener);
    };
  }, []);

  useEffect(() => {
    const handleWindowFocus = () => {
      setBrowserNotificationPermission(getNotificationPermission());
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    if (browserNotificationPermission.denied && systemNotificationsEnabled) {
      setSystemNotificationsEnabled(false);
      localStorage.setItem("systemNotifications", JSON.stringify(false));

      if (user?.uid) {
        setUserNotificationSettings(user.uid, {
          systemNotifications: false,
        });
      }

      window.dispatchEvent(
        new CustomEvent("systemNotificationsChanged", {
          detail: { enabled: false },
        })
      );

      toast.error(t("notifications.permissionDenied"));
    }
  }, [
    browserNotificationPermission.denied,
    systemNotificationsEnabled,
    user?.uid,
    t,
  ]);

  const handleNotificationToggle = async () => {
    if (notificationsEnabled === null) return; // 아직 로드되지 않았으면 무시

    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem("notifications", JSON.stringify(newValue));
    localStorage.setItem("bookmarkNotifications", JSON.stringify(newValue));

    const nextSystemValue = newValue
      ? systemNotificationsEnabled ?? false
      : false;

    // Firestore에 저장
    if (user?.uid) {
      try {
        await setUserNotificationSettings(user.uid, {
          notifications: newValue,
          bookmarkNotifications: newValue,
          systemNotifications: nextSystemValue,
        });
      } catch (error) {
        console.error("알림 설정 저장 실패:", error);
        // 저장 실패 시 이전 값으로 복구
        const previousValue = !newValue;
        setNotificationsEnabled(previousValue);
        localStorage.setItem("notifications", JSON.stringify(previousValue));
        localStorage.setItem(
          "bookmarkNotifications",
          JSON.stringify(previousValue)
        );
      }
    }

    if (!newValue) {
      setSystemNotificationsEnabled(false);
      localStorage.setItem("systemNotifications", JSON.stringify(false));
      window.dispatchEvent(
        new CustomEvent("systemNotificationsChanged", {
          detail: { enabled: false },
        })
      );
    }

    window.dispatchEvent(
      new CustomEvent("notificationsChanged", {
        detail: { enabled: newValue },
      })
    );
    window.dispatchEvent(
      new CustomEvent("bookmarkNotificationsChanged", {
        detail: { enabled: newValue },
      })
    );
    toast.success(
      `${t("notifications.bookmarkNotifications")} ${
        newValue ? t("notifications.enable") : t("notifications.disable")
      }`
    );
  };

  const handleSystemNotificationToggle = async () => {
    if (systemNotificationsEnabled === null) return;

    if (!notificationsEnabled) {
      toast.error(t("notifications.enableBookmarkFirst"));
      return;
    }

    const turningOn = !systemNotificationsEnabled;
    if (turningOn) {
      const hasPermission = await requestNotificationPermission();
      const permission = getNotificationPermission();
      setBrowserNotificationPermission(permission);

      if (!hasPermission || permission.granted === false) {
        toast.error(
          "시스템 알림 권한이 필요합니다. 브라우저 설정에서 알림을 허용해주세요."
        );
        return;
      }
    }

    const newValue = !systemNotificationsEnabled;
    setSystemNotificationsEnabled(newValue);
    localStorage.setItem("systemNotifications", JSON.stringify(newValue));

    if (user?.uid) {
      try {
        await setUserNotificationSettings(user.uid, {
          systemNotifications: newValue,
        });
      } catch (error) {
        console.error("시스템 알림 설정 저장 실패:", error);
        const previousValue = !newValue;
        setSystemNotificationsEnabled(previousValue);
        localStorage.setItem(
          "systemNotifications",
          JSON.stringify(previousValue)
        );
        return;
      }
    }

    window.dispatchEvent(
      new CustomEvent("systemNotificationsChanged", {
        detail: { enabled: newValue },
      })
    );

    toast.success(
      `${t("notifications.systemNotifications")} ${
        newValue ? t("notifications.enable") : t("notifications.disable")
      }`
    );
  };
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "bookmark_added":
        return <BookOpen className="w-5 h-5" />;
      case "bookmark_updated":
        return <Edit className="w-5 h-5" />;
      case "bookmark_deleted":
        return <Trash2 className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return t("notifications.justNow");
    if (minutes < 60) return t("notifications.minutesAgo", { count: minutes });
    if (hours < 24) return t("notifications.hoursAgo", { count: hours });
    if (days < 7) return t("notifications.daysAgo", { count: days });
    return date.toLocaleDateString();
  };

  return (
    <Drawer>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* 헤더 */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center space-x-2">
                  <Bell className="w-6 h-6 text-brand-600" />
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t("notifications.center")}
                  </h1>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center min-w-[20px]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate("/settings")}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 알림 설정 카드 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("notifications.settings")}
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t("notifications.bookmarkNotifications")}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("notifications.bookmarkNotificationsDescription")}
                    </p>
                  </div>
                  <button
                    onClick={handleNotificationToggle}
                    disabled={notificationsEnabled === null}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationsEnabled === null
                        ? "bg-gray-300 dark:bg-gray-600 opacity-50 cursor-not-allowed"
                        : notificationsEnabled
                        ? "bg-brand-600"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationsEnabled === null
                          ? "translate-x-1"
                          : notificationsEnabled
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t("notifications.systemNotifications")}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("notifications.systemNotificationsDescription")}
                    </p>
                    {browserNotificationPermission.denied && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {t("notifications.permissionDenied")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() =>
                        showTestNotification(
                          t("notifications.testNotificationTitle"),
                          t("notifications.testNotificationMessage")
                        )
                      }
                      disabled={
                        !systemNotificationsEnabled ||
                        browserNotificationPermission.denied
                      }
                    >
                      {t("notifications.testNotification")}
                    </button>
                    <button
                      onClick={handleSystemNotificationToggle}
                      disabled={systemNotificationsEnabled === null}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        systemNotificationsEnabled === null
                          ? "bg-gray-300 dark:bg-gray-600 opacity-50 cursor-not-allowed"
                          : systemNotificationsEnabled
                          ? "bg-brand-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          systemNotificationsEnabled === null
                            ? "translate-x-1"
                            : systemNotificationsEnabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
              {unreadCount > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("notifications.unreadCount", { count: unreadCount })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("notifications.title")}
                </h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="text-xs sm:text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 px-2 sm:px-3 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      모두 삭제
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs sm:text-sm text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 px-2 sm:px-3 py-1 rounded-md hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    >
                      {t("notifications.markAllAsRead")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    {t("notifications.noNotifications")}
                  </p>
                  <p className="text-sm">
                    {t("notifications.noNotificationsDescription")}
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.isRead
                        ? "bg-blue-50/50 dark:bg-blue-900/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* 아이콘 */}
                      <div
                        className={`p-3 rounded-lg ${
                          notification.type === "bookmark_added"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : notification.type === "bookmark_updated"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : notification.type === "bookmark_deleted"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-base font-medium text-gray-900 dark:text-white mb-1">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>

                          {/* 액션 버튼들 */}
                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                title={t("notifications.markAsRead")}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                deleteNotification(notification.id)
                              }
                              className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                              title={t("notifications.deleteNotification")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 푸터 */}
            {notifications.filter((n) => n.isRead).length > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={deleteReadNotifications}
                  className="w-full text-sm text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-center py-2"
                >
                  {t("notifications.deleteAllRead")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
