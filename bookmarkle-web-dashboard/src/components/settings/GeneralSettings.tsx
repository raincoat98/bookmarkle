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

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  defaultPage,
  onDefaultPageChange,
  onExportData,
  onExportChromeBookmarks,
  onImportData,
  onImportChromeBookmarks,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("settings.basicSettings")}
        </h3>
        <div className="space-y-6">
          <div>
            <p className="font-medium text-gray-900 dark:text-white mb-3">
              {t("settings.mainPage")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("settings.mainPageDescription")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => onDefaultPageChange("dashboard")}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  defaultPage === "dashboard"
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-900"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-brand-100 dark:bg-brand-800 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t("settings.dashboard")}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("settings.dashboardDescription")}
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => onDefaultPageChange("bookmarks")}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  defaultPage === "bookmarks"
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-900"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center">
                    <List className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t("settings.bookmarkList")}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("settings.bookmarkListDescription")}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("settings.dataManagement")}
        </h3>
        <div className="space-y-4">
          {/* 데이터 내보내기 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t("settings.exportData")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("settings.exportDataDescription")}
              </p>
            </div>
            <button
              onClick={onExportData}
              className="inline-flex items-center px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              {t("settings.export")}
            </button>
          </div>
          {/* 데이터 가져오기 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t("settings.importData")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("settings.importDataDescription")}
              </p>
            </div>
            <button
              onClick={onImportData}
              className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("settings.import")}
            </button>
          </div>

          {/* 구분선 */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          {/* HTML 내보내기 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t("settings.exportChromeBookmarks")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("settings.exportChromeBookmarksDescription")}
              </p>
            </div>
            <button
              onClick={onExportChromeBookmarks}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              {t("settings.exportChrome")}
            </button>
          </div>
          {/* HTML 가져오기 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t("settings.importChromeBookmarks")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("settings.importChromeBookmarksDescription")}
              </p>
            </div>
            <button
              onClick={onImportChromeBookmarks}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("settings.importChrome")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
