import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell, BookOpen, Check, Edit, Trash2, X } from "lucide-react";
import { useNotifications } from "../../hooks/notification/useNotifications";
import { useNotificationSetting } from "../../hooks/notification/useNotificationSetting";

interface NotificationDropdownProps {
  userId: string | undefined;
  isMobile: boolean;
}

const formatRelativeTime = (
  createdAt: Date | string | number,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  const now = new Date();
  const date = new Date(createdAt);
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return t("notifications.justNow");
  if (minutes < 60) return t("notifications.minutesAgo", { count: minutes });
  if (hours < 24) return t("notifications.hoursAgo", { count: hours });
  return t("notifications.daysAgo", { count: days });
};

const notificationIcon = (type: string) => {
  if (type === "bookmark_added") return <BookOpen className="w-4 h-4" />;
  if (type === "bookmark_updated") return <Edit className="w-4 h-4" />;
  if (type === "bookmark_deleted") return <Trash2 className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
};

const notificationBadgeClass = (type: string) => {
  if (type === "bookmark_added")
    return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
  if (type === "bookmark_updated")
    return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
  if (type === "bookmark_deleted")
    return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
  return "bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400";
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  userId,
  isMobile,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications(userId || "");
  const { enabled, toggle } = useNotificationSetting(userId);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  // 알림 비활성화 시 강제 닫기
  useEffect(() => {
    if (!enabled) setIsOpen(false);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (isMobile) {
            navigate("/notifications");
          } else {
            setIsOpen((prev) => !prev);
          }
        }}
        className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
        aria-label={t("notifications.title")}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && !isMobile && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-12 mt-2 w-80 sm:w-96 bg-white dark:bg-[#111113] rounded-xl shadow-xl border border-gray-200 dark:border-white/[0.06] z-50 max-h-[600px] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.06]">
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
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

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
                  className={`border-b border-gray-100 dark:border-white/[0.06] p-4 hover:bg-gray-50 dark:hover:bg-white/[0.08]/50 transition-colors ${
                    !notification.isRead
                      ? "bg-blue-50/50 dark:bg-blue-900/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-lg ${notificationBadgeClass(
                        notification.type
                      )}`}
                    >
                      {notificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {formatRelativeTime(notification.createdAt, t)}
                      </p>
                    </div>

                    <div className="flex flex-col space-y-1">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                          title={t("notifications.markAsRead")}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-white/[0.08]"
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

          <div className="p-4 border-t border-gray-200 dark:border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("notifications.bookmarkNotifications")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("notifications.bookmarkNotificationsDescription")}
                </p>
              </div>
              <button
                onClick={toggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                  enabled
                    ? "bg-violet-600"
                    : "bg-gray-200 dark:bg-white/[0.08]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
