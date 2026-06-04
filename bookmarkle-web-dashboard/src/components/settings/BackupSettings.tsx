import React from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2 } from "lucide-react";
import type {
  BackupSettings,
  BackupStatus,
  BackupListItem,
} from "../../utils/backup";

interface BackupSettingsProps {
  backupSettings: BackupSettings;
  backupStatus: BackupStatus;
  backups: BackupListItem[];
  onAutoBackupToggle: () => void;
  onBackupFrequencyChange: (frequency: "daily" | "weekly" | "monthly") => void;
  onManualBackup: () => void;
  onBackupRestore: (timestamp: string) => void;
  onBackupDelete: (timestamp: string) => void;
}

const FREQUENCIES = [
  { value: "daily",   labelKey: "settings.daily"   },
  { value: "weekly",  labelKey: "settings.weekly"  },
  { value: "monthly", labelKey: "settings.monthly" },
] as const;

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
    <div className="space-y-4">
      {/* 자동 백업 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("settings.autoBackup")}
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {/* 토글 행 */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t("settings.autoBackup")}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t("settings.autoBackupDescription")}
              </p>
            </div>
            <button
              type="button"
              onClick={onAutoBackupToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                backupSettings.enabled
                  ? "bg-purple-600"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
              aria-pressed={backupSettings.enabled}
              aria-label={t("settings.autoBackupToggle")}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  backupSettings.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* 주기 선택 (활성화 시) */}
          {backupSettings.enabled && (
            <div className="px-5 py-3.5">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t("settings.autoBackupFrequency")}
              </p>
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900/60 rounded-lg">
                {FREQUENCIES.map(({ value, labelKey }) => {
                  const active = backupSettings.frequency === value;
                  return (
                    <button
                      key={value}
                      onClick={() => onBackupFrequencyChange(value)}
                      className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-150 ${
                        active
                          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 백업 상태 + 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("settings.backupStatus")}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t("settings.backupStatusDescription", {
                count: backupStatus.backupCount,
                size: backupStatus.totalSize,
              })}
            </p>
          </div>
          <button
            onClick={onManualBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors shrink-0"
          >
            {t("settings.createNewBackup")}
          </button>
        </div>

        {backups.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-64 overflow-y-auto">
            {backups.map(({ timestamp, data }) => (
              <div
                key={timestamp}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(timestamp).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {t("settings.backupItemDescription", {
                      bookmarkCount: data.bookmarks?.length || 0,
                      collectionCount: data.collections?.length || 0,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onBackupRestore(timestamp)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t("settings.restore")}
                  </button>
                  <button
                    onClick={() => onBackupDelete(timestamp)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
