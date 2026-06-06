import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Briefcase, List, Download, Upload, ArrowRight } from "lucide-react";

interface GeneralSettingsProps {
  defaultPage: string;
  onDefaultPageChange: (page: string) => void;
  onExportData: () => void;
  onExportChromeBookmarks: () => void;
  onImportData: () => void;
  onImportChromeBookmarks: () => void;
}

const PAGES = [
  { value: "dashboard", icon: Briefcase, labelKey: "settings.dashboard" },
  { value: "bookmarks", icon: List,      labelKey: "settings.bookmarkList" },
] as const;

const DATA_ACTIONS = [
  [
    { labelKey: "settings.exportData",    descKey: "settings.exportDataDescription",    icon: Download, action: "export",        iconBg: "bg-violet-50 dark:bg-violet-500/10", iconColor: "text-violet-600 dark:text-violet-400" },
    { labelKey: "settings.importData",    descKey: "settings.importDataDescription",    icon: Upload,   action: "import",        iconBg: "bg-violet-50 dark:bg-violet-500/10", iconColor: "text-violet-600 dark:text-violet-400" },
  ],
  [
    { labelKey: "settings.exportChromeBookmarks", descKey: "settings.exportChromeBookmarksDescription", icon: Download, action: "exportChrome", iconBg: "bg-blue-50 dark:bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400" },
    { labelKey: "settings.importChromeBookmarks", descKey: "settings.importChromeBookmarksDescription", icon: Upload,   action: "importChrome", iconBg: "bg-blue-50 dark:bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400" },
  ],
] as const;

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  defaultPage,
  onDefaultPageChange,
  onExportData,
  onExportChromeBookmarks,
  onImportData,
  onImportChromeBookmarks,
}) => {
  const { t } = useTranslation();
  const [pendingPage, setPendingPage] = useState<string | null>(null);

  const handlers: Record<string, () => void> = {
    export: onExportData,
    import: onImportData,
    exportChrome: onExportChromeBookmarks,
    importChrome: onImportChromeBookmarks,
  };

  const handlePageClick = (value: string) => {
    if (value === defaultPage) return;
    setPendingPage(value);
  };

  const handleConfirm = () => {
    if (pendingPage) {
      onDefaultPageChange(pendingPage);
      setPendingPage(null);
    }
  };

  const fromPage = PAGES.find(p => p.value === defaultPage);
  const toPage   = PAGES.find(p => p.value === pendingPage);

  return (
    <>
      <div className="space-y-3">
        {/* 메인 페이지 */}
        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t("settings.mainPage")}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t("settings.mainPageDescription")}
            </p>
          </div>
          <div className="px-4 pb-4">
            <div className="flex gap-1 p-1 bg-gray-50 dark:bg-white/[0.04] rounded-xl">
              {PAGES.map(({ value, icon: Icon, labelKey }) => {
                const active = defaultPage === value;
                return (
                  <button
                    key={value}
                    onClick={() => handlePageClick(value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t(labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 데이터 관리 */}
        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t("settings.dataManagement")}
            </p>
          </div>
          <div className="px-2 pb-2 space-y-0.5">
            {DATA_ACTIONS.map((group, gi) => (
              <React.Fragment key={gi}>
                {gi > 0 && <div className="mx-3 my-1 border-t border-gray-50 dark:border-white/[0.04]" />}
                {group.map(({ labelKey, descKey, icon: Icon, action, iconBg, iconColor }) => (
                  <div
                    key={action}
                    className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t(labelKey)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {t(descKey)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handlers[action]}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 ml-3 bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t(action.startsWith("export") ? "settings.export" : "settings.import")}
                    </button>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 페이지 변경 확인 모달 */}
      {pendingPage && fromPage && toPage && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {t("settings.mainPage")} 변경
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
              앱을 처음 열 때 표시할 페이지를 변경합니다.
            </p>
            <div className="flex items-center justify-center gap-3 mb-5 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
                <fromPage.icon className="w-4 h-4" />
                <span>{t(fromPage.labelKey)}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-violet-400 shrink-0" />
              <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
                <toPage.icon className="w-4 h-4" />
                <span>{t(toPage.labelKey)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPendingPage(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors">
                {t("common.cancel")}
              </button>
              <button onClick={handleConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors">
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
