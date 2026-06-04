import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, X } from "lucide-react";
import type { NotificationPermission } from "../../utils/browserNotifications";

interface NotificationSettingsProps {
  notifications: boolean;
  systemNotifications: boolean;
  browserNotificationPermission: NotificationPermission;
  onNotificationToggle: () => void;
  onSystemNotificationToggle: () => void;
  onNavigateToNotifications: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  notifications,
  systemNotifications,
  browserNotificationPermission,
  onNotificationToggle,
  onSystemNotificationToggle,
  onNavigateToNotifications,
}) => {
  const { t } = useTranslation();
  const systemDisabled = !notifications;
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("settings.notifications")}
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {/* 북마크 알림 */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="min-w-0 mr-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t("notifications.bookmarkNotifications")}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t("notifications.bookmarkNotificationsDescription")}
              </p>
            </div>
            <button
              onClick={onNotificationToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                notifications ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  notifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* 시스템 알림 */}
          <div className="flex items-start justify-between px-5 py-3.5">
            <div className="min-w-0 mr-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t("notifications.systemNotifications")}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t("notifications.systemNotificationsDescription")}
              </p>
              {systemDisabled && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {t("notifications.enableBookmarkFirst")}
                </p>
              )}
              {browserNotificationPermission.denied && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {t("notifications.permissionDenied")}
                </p>
              )}
              {(systemDisabled || browserNotificationPermission.denied) && (
                <button
                  type="button"
                  onClick={() => setShowPermissionHelp(true)}
                  className="mt-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {t("notifications.permissionHelpButton")}
                </button>
              )}
            </div>
            <button
              onClick={onSystemNotificationToggle}
              disabled={systemDisabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 mt-0.5 disabled:opacity-40 ${
                systemNotifications && !systemDisabled
                  ? "bg-purple-600"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  systemNotifications && !systemDisabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* 알림센터 */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="min-w-0 mr-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t("notifications.center")}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t("notifications.centerDescription")}
              </p>
            </div>
            <button
              onClick={onNavigateToNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors shrink-0"
            >
              <Bell className="w-3.5 h-3.5" />
              {t("notifications.viewCenter")}
            </button>
          </div>
        </div>
      </div>

      {/* 권한 안내 모달 */}
      {showPermissionHelp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                {t("notifications.permissionHelpTitle")}
              </h4>
              <button
                type="button"
                onClick={() => setShowPermissionHelp(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("notifications.permissionHelpIntro")}
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li>{t("notifications.permissionHelpStep1")}</li>
              <li>{t("notifications.permissionHelpStep2")}</li>
              <li>{t("notifications.permissionHelpStep3")}</li>
              <li>{t("notifications.permissionHelpStep4")}</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowPermissionHelp(false)}
              className="w-full py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
