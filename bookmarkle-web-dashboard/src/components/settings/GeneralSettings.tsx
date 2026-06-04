import React from "react";
import { useTranslation } from "react-i18next";
import { Briefcase, List, Download, Upload } from "lucide-react";

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
    { labelKey: "settings.exportData",    descKey: "settings.exportDataDescription",    icon: Download, action: "export",        variant: "default" as const },
    { labelKey: "settings.importData",    descKey: "settings.importDataDescription",    icon: Upload,   action: "import",        variant: "default" as const },
  ],
  [
    { labelKey: "settings.exportChromeBookmarks", descKey: "settings.exportChromeBookmarksDescription", icon: Download, action: "exportChrome", variant: "blue" as const },
    { labelKey: "settings.importChromeBookmarks", descKey: "settings.importChromeBookmarksDescription", icon: Upload,   action: "importChrome", variant: "blue" as const },
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

  const handlers: Record<string, () => void> = {
    export: onExportData,
    import: onImportData,
    exportChrome: onExportChromeBookmarks,
    importChrome: onImportChromeBookmarks,
  };

  return (
    <div className="space-y-4">
      {/* 메인 페이지 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("settings.mainPage")}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {t("settings.mainPageDescription")}
          </p>
        </div>
        <div className="p-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900/60 rounded-lg">
            {PAGES.map(({ value, icon: Icon, labelKey }) => {
              const active = defaultPage === value;
              return (
                <button
                  key={value}
                  onClick={() => onDefaultPageChange(value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("settings.dataManagement")}
          </h3>
        </div>
        <div>
          {DATA_ACTIONS.map((group, gi) => (
            <React.Fragment key={gi}>
              {gi > 0 && (
                <div className="mx-5 border-t border-gray-100 dark:border-gray-700/60" />
              )}
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {group.map(({ labelKey, descKey, icon: Icon, action, variant }) => (
                  <div
                    key={action}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="min-w-0 mr-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(labelKey)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {t(descKey)}
                      </p>
                    </div>
                    <button
                      onClick={handlers[action]}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium shrink-0 transition-colors ${
                        variant === "blue"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t(action.startsWith("export") ? "settings.export" : "settings.import")}
                    </button>
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
