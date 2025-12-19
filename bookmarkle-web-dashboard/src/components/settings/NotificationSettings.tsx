import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
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
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("settings.notifications")}
        </h3>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white">
                {t("notifications.bookmarkNotifications")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                {t("notifications.bookmarkNotificationsDescription")}
              </p>
            </div>
            <div className="flex items-center justify-end sm:justify-start flex-shrink-0">
              <button
                onClick={onNotificationToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white">
                {t("notifications.systemNotifications")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
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
                  className="mt-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {t("notifications.permissionHelpButton")}
                </button>
              )}
            </div>
            <div className="flex items-center justify-end sm:justify-start flex-shrink-0">
              <button
                onClick={onSystemNotificationToggle}
                disabled={systemDisabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemNotifications && !systemDisabled
                    ? "bg-brand-600"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemNotifications && !systemDisabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-0">
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {t("notifications.center")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("notifications.centerDescription")}
              </p>
            </div>
            <button
              onClick={onNavigateToNotifications}
              className="px-3 sm:px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base whitespace-nowrap"
            >
              <Bell className="w-4 h-4" />
              <span>{t("notifications.viewCenter")}</span>
            </button>
          </div>
        </div>
      </div>

      {showPermissionHelp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("notifications.permissionHelpTitle")}
              </h4>
              <button
                type="button"
                onClick={() => setShowPermissionHelp(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("notifications.permissionHelpIntro")}
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <li>{t("notifications.permissionHelpStep1")}</li>
              <li>{t("notifications.permissionHelpStep2")}</li>
              <li>{t("notifications.permissionHelpStep3")}</li>
              <li>{t("notifications.permissionHelpStep4")}</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowPermissionHelp(false)}
              className="w-full rounded-lg bg-brand-600 text-white py-2 hover:bg-brand-700 transition-colors"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
