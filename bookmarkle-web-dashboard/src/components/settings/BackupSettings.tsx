import React from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2, Download, Shield } from "lucide-react";
import type { BackupSettings, BackupStatus, BackupListItem } from "../../utils/backup";
import { downloadBackupAsFile } from "../../utils/backup";

interface BackupSettingsProps {
  backupSettings: BackupSettings;
  backupStatus: BackupStatus;
  backups: BackupListItem[];
  currentChecksum?: string;
  onAutoBackupToggle: () => void;
  onBackupFrequencyChange: (frequency: "daily" | "weekly" | "monthly") => void;
  onManualBackup: () => void;
  onBackupRestore: (id: string) => void;
  onBackupDelete: (id: string) => void;
}

const FREQUENCIES = [
  { value: "daily",   labelKey: "settings.daily"   },
  { value: "weekly",  labelKey: "settings.weekly"  },
  { value: "monthly", labelKey: "settings.monthly" },
] as const;

const TAG_STYLE: Record<string, string> = {
  "manual":      "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
  "pre-restore": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  "auto":        "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400",
};
const TAG_LABEL: Record<string, string> = {
  "manual":      "수동",
  "pre-restore": "복원 전 스냅샷",
  "auto":        "자동",
};

interface ToggleProps { enabled: boolean; onChange: () => void; }
const Toggle: React.FC<ToggleProps> = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    aria-pressed={enabled}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-75 ${
      enabled ? "bg-violet-600" : "bg-gray-200 dark:bg-white/[0.08]"
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

export const BackupSettingsComponent: React.FC<BackupSettingsProps> = ({
  backupSettings,
  backupStatus,
  backups,
  currentChecksum,
  onAutoBackupToggle,
  onBackupFrequencyChange,
  onManualBackup,
  onBackupRestore,
  onBackupDelete,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* 보안 안내 */}
      <div className="flex items-start gap-3 px-4 py-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 rounded-2xl">
        <Shield className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
          백업 데이터는 클라우드(Firestore)에 안전하게 저장됩니다. 복원 전 현재 상태가 자동으로 스냅샷 저장됩니다.
        </p>
      </div>

      {/* 자동 백업 */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t("settings.autoBackup")}
          </p>
        </div>
        <div className="px-2 pb-2 space-y-0.5">
          {/* 자동 백업 토글 */}
          <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t("settings.autoBackup")}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t("settings.autoBackupDescription")}
              </p>
            </div>
            <Toggle enabled={backupSettings.enabled} onChange={onAutoBackupToggle} />
          </div>

          {/* 주기 선택 */}
          {backupSettings.enabled && (
            <div className="px-3 py-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                {t("settings.autoBackupFrequency")}
              </p>
              <div className="flex gap-1 p-1 bg-gray-50 dark:bg-white/[0.04] rounded-xl">
                {FREQUENCIES.map(({ value, labelKey }) => {
                  const active = backupSettings.frequency === value;
                  return (
                    <button
                      key={value}
                      onClick={() => onBackupFrequencyChange(value)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                        active
                          ? "bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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

      {/* 백업 목록 */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t("settings.backupStatus")}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
              {t("settings.backupStatusDescription", {
                count: backupStatus.backupCount,
                size:  backupStatus.totalSize,
              })}
            </p>
            {backupStatus.lastBackup && (
              <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-0.5">
                마지막: {new Date(backupStatus.lastBackup).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={onManualBackup}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors shrink-0 whitespace-nowrap mt-0.5"
          >
            {t("settings.createNewBackup")}
          </button>
        </div>

        {backups.length > 0 ? (
          <div className="px-2 pb-2 space-y-0.5 max-h-72 overflow-y-auto">
            {backups.map(({ id, timestamp, data }) => {
              const tag = data.tag ?? "auto";
              const isCurrent = !!currentChecksum && !!data.checksum && data.checksum === currentChecksum;
              return (
                <div key={id} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(timestamp).toLocaleString()}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TAG_STYLE[tag] ?? TAG_STYLE["auto"]}`}>
                        {TAG_LABEL[tag] ?? tag}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                          현재 상태
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {t("settings.backupItemDescription", {
                        bookmarkCount:   data.bookmarks?.length ?? 0,
                        collectionCount: data.collections?.length ?? 0,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => downloadBackupAsFile(data, timestamp)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
                      title="JSON 다운로드"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => !isCurrent && onBackupRestore(id)}
                      disabled={isCurrent}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        isCurrent
                          ? "text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-white/[0.04] cursor-not-allowed opacity-50"
                          : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {t("settings.restore")}
                    </button>
                    <button
                      onClick={() => onBackupDelete(id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              백업이 없습니다. 새 백업을 생성하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
