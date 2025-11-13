import React from "react";
import { useTranslation } from "react-i18next";
import type { BackupSettings } from "../../utils/backup";

interface BackupSettingsProps {
  backupSettings: BackupSettings;
  backupStatus: any;
  backups: any[];
  onAutoBackupToggle: () => void;
  onBackupFrequencyChange: (frequency: "daily" | "weekly" | "monthly") => void;
  onManualBackup: () => void;
  onBackupRestore: (timestamp: string) => void;
  onBackupDelete: (timestamp: string) => void;
}

export const BackupSettingsComponent: React.FC<BackupSettingsProps> = ({
  backupSettings,
  backupStatus,
  backups,
  onAutoBackupToggle,
  onBackupFrequencyChange,
  onManualBackup,
  onBackupRestore,
  onBackupDelete,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("settings.backupManagement")}
        </h3>
        <div className="space-y-4">
          {/* 자동 백업 토글 UI 추가 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t("settings.autoBackup")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("settings.autoBackupDescription")}
              </p>
            </div>
            <button
              type="button"
              onClick={onAutoBackupToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                backupSettings.enabled
                  ? "bg-brand-600"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
              aria-pressed={backupSettings.enabled}
              aria-label={t("settings.autoBackupToggle")}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  backupSettings.enabled ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {/* 자동 백업 주기 선택 UI: 활성화 상태에서만 표시 */}
          {backupSettings.enabled && (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {t("settings.autoBackupFrequency")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("settings.autoBackupFrequencyDescription")}
                </p>
              </div>
              <select
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                value={backupSettings.frequency}
                onChange={(e) =>
                  onBackupFrequencyChange(
                    e.target.value as "daily" | "weekly" | "monthly"
                  )
                }
              >
                <option value="daily">{t("settings.daily")}</option>
                <option value="weekly">{t("settings.weekly")}</option>
                <option value="monthly">{t("settings.monthly")}</option>
              </select>
            </div>
          )}
          {/* 기존 백업 상태/수동 백업 버튼 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t("settings.backupStatus")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("settings.backupStatusDescription", {
                  count: backupStatus.backupCount,
                  size: backupStatus.totalSize,
                })}
              </p>
            </div>
            <button
              onClick={onManualBackup}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              {t("settings.createNewBackup")}
            </button>
          </div>

          {backups.length > 0 && (
            <div className="space-y-3">
              <p className="font-medium text-gray-900 dark:text-white">
                {t("settings.backupList")}
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {backups.map(({ timestamp, data }) => (
                  <div
                    key={timestamp}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("settings.backupItemDescription", {
                          bookmarkCount: data.bookmarks?.length || 0,
                          collectionCount: data.collections?.length || 0,
                        })}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onBackupRestore(timestamp)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        {t("settings.restore")}
                      </button>
                      <button
                        onClick={() => onBackupDelete(timestamp)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
