import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Monitor, ExternalLink, X } from "lucide-react";
import type { NotificationPermission } from "../../utils/browserNotifications";

interface NotificationSettingsProps {
  notifications: boolean;
  systemNotifications: boolean;
  browserNotificationPermission: NotificationPermission;
  onNotificationToggle: () => void;
  onSystemNotificationToggle: () => void;
  onNavigateToNotifications: () => void;
}

interface ToggleProps {
  enabled: boolean;
  disabled?: boolean;
  onChange: () => void;
}
const Toggle: React.FC<ToggleProps> = ({ enabled, disabled, onChange }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-75 ${
      enabled && !disabled ? "bg-violet-600" : "bg-gray-200 dark:bg-white/[0.08]"
    } disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
      enabled && !disabled ? "translate-x-6" : "translate-x-1"
    }`} />
  </button>
);

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  notifications,
  systemNotifications,
  browserNotificationPermission,
  onNotificationToggle,
  onSystemNotificationToggle,
  onNavigateToNotifications,
}) => {
  const { t } = useTranslation();
  const systemDisabled = !notifications || browserNotificationPermission.denied;
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t("settings.notifications")}
          </p>
        </div>
        <div className="px-2 pb-2 space-y-0.5">

          {/* 북마크 알림 */}
          <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("notifications.bookmarkNotifications")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {t("notifications.bookmarkNotificationsDescription")}
                </p>
              </div>
            </div>
            <Toggle enabled={notifications} onChange={onNotificationToggle} />
          </div>

          {/* 시스템 알림 */}
          <div className="flex items-start justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("notifications.systemNotifications")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {t("notifications.systemNotificationsDescription")}
                </p>
                {!notifications && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {t("notifications.enableBookmarkFirst")}
                  </p>
                )}
                {browserNotificationPermission.denied && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    {t("notifications.permissionDenied")}
                  </p>
                )}
                {(systemDisabled) && (
                  <button
                    type="button"
                    onClick={() => setShowPermissionHelp(true)}
                    className="mt-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    {t("notifications.permissionHelpButton")}
                  </button>
                )}
              </div>
            </div>
            <Toggle enabled={systemNotifications} disabled={systemDisabled} onChange={onSystemNotificationToggle} />
          </div>

          {/* 알림센터 */}
          <div className="flex items-center justify-between gap-2 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {t("notifications.center")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {t("notifications.centerDescription")}
                </p>
              </div>
            </div>
            <button
              onClick={onNavigateToNotifications}
              className="flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors shrink-0 whitespace-nowrap"
              title={t("notifications.viewCenter")}
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("notifications.viewCenter")}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 권한 안내 모달 */}
      {showPermissionHelp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                {t("notifications.permissionHelpTitle")}
              </h4>
              <button
                type="button"
                onClick={() => setShowPermissionHelp(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
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
              className="w-full py-2.5 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
