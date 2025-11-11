import { useState, useRef, useEffect } from "react";
import {
  Bell,
  X,
  Check,
  Trash2,
  Bookmark,
  Edit,
  Trash,
  Info,
} from "lucide-react";
import { useTranslation } from "../../node_modules/react-i18next";
import { useNotifications } from "../hooks/useNotifications";
import { useAuthStore } from "../stores";
import type { Notification } from "../types";
import { db, getUserNotificationSettings } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export const NotificationCenter = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    deleteAllNotifications,
  } = useNotifications(user?.uid || "");

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // 알림 설정 동기화 (다른 컴포넌트와의 동기화를 위해 유지)
  const getInitialNotificationsSetting = () => {
    const saved = localStorage.getItem("notifications");
    if (saved !== null) return JSON.parse(saved);
    const legacy = localStorage.getItem("bookmarkNotifications");
    if (legacy !== null) return JSON.parse(legacy);
    return true;
  };

  const [, setNotificationsEnabled] = useState(getInitialNotificationsSetting);

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

          // 값이 실제로 변경되었을 때만 업데이트
          setNotificationsEnabled((prev: boolean) => {
            if (prev !== newValue) {
              localStorage.setItem("notifications", JSON.stringify(newValue));
              localStorage.setItem(
                "bookmarkNotifications",
                JSON.stringify(newValue)
              );
              return newValue;
            }
            return prev;
          });
        } else {
          // 문서가 없으면 기본값 사용
          setNotificationsEnabled((prev: boolean) => {
            if (prev !== true) {
              localStorage.setItem("notifications", JSON.stringify(true));
              localStorage.setItem(
                "bookmarkNotifications",
                JSON.stringify(true)
              );
              return true;
            }
            return prev;
          });
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
            if (fallback !== undefined) {
              setNotificationsEnabled(fallback);
              localStorage.setItem("notifications", JSON.stringify(fallback));
              localStorage.setItem(
                "bookmarkNotifications",
                JSON.stringify(fallback)
              );
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
    };

    const listener = handleNotificationsChange as EventListener;

    window.addEventListener("notificationsChanged", listener);
    window.addEventListener("bookmarkNotificationsChanged", listener);

    return () => {
      window.removeEventListener("notificationsChanged", listener);
      window.removeEventListener("bookmarkNotificationsChanged", listener);
    };
  }, []);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "bookmark_added":
        return <Bookmark className="w-4 h-4" />;
      case "bookmark_updated":
        return <Edit className="w-4 h-4" />;
      case "bookmark_deleted":
        return <Trash className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
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
    <div className="relative" ref={dropdownRef}>
      {/* 알림 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-all duration-200 hover:scale-110 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
        aria-label={t("notifications.title")}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 bg-black/20 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed right-2 left-2 top-16 sm:right-4 sm:left-auto sm:w-80 lg:absolute lg:right-0 lg:top-10 lg:mt-2 lg:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] max-h-[600px] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("notifications.title")}
              </h3>
              <div className="flex items-center space-x-1 sm:space-x-2">
                {notifications.length > 0 && (
                  <button
                    onClick={deleteAllNotifications}
                    className="text-xs sm:text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 px-1 sm:px-0"
                  >
                    {t("notifications.deleteAll")}
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs sm:text-sm text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 px-1 sm:px-0"
                  >
                    {t("notifications.markAllAsRead")}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 알림 목록 */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t("notifications.noNotifications")}</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b border-gray-100 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.isRead
                        ? "bg-blue-50/50 dark:bg-blue-900/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* 아이콘 */}
                      <div
                        className={`p-2 rounded-lg ${
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
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex flex-col space-y-1">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            title={t("notifications.markAsRead")}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title={t("notifications.deleteNotification")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 푸터 */}
            {notifications.filter((n) => n.isRead).length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={deleteReadNotifications}
                  className="w-full text-sm text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-center"
                >
                  {t("notifications.deleteAllRead")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
