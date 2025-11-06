import React from "react";
import { useTranslation } from "../../../node_modules/react-i18next";
import type { i18n as I18nType } from "i18next";
import { Sun, Moon, Globe } from "lucide-react";

interface AppearanceSettingsProps {
  theme: string;
  onThemeChange: (theme: "light" | "dark" | "auto") => void;
  i18n: I18nType;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  onThemeChange,
  i18n,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 테마 설정 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          {t("settings.theme")}
        </h3>
        <div className="space-y-3 sm:space-y-4">
          {/* 모바일/데스크톱: 한 줄에 표시 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <button
              onClick={() => onThemeChange("light")}
              className={`p-3 sm:p-5 rounded-lg border-2 transition-all duration-200 active:scale-[0.98] ${
                theme === "light"
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <Sun className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-yellow-500" />
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white text-center">
                {t("settings.themeLight")}
              </p>
            </button>
            <button
              onClick={() => onThemeChange("dark")}
              className={`p-3 sm:p-5 rounded-lg border-2 transition-all duration-200 active:scale-[0.98] ${
                theme === "dark"
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <Moon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-blue-500" />
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white text-center">
                {t("settings.themeDark")}
              </p>
            </button>
            <button
              onClick={() => onThemeChange("auto")}
              className={`p-3 sm:p-5 rounded-lg border-2 transition-all duration-200 active:scale-[0.98] ${
                theme === "auto"
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <Globe className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-green-500" />
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white text-center">
                {t("settings.themeSystem")}
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* 언어 설정 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          {t("settings.language")}
        </h3>
        <div className="space-y-3 sm:space-y-4">
          {/* 모바일/데스크톱: 한 줄에 표시 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <button
              onClick={() => i18n.changeLanguage("ko")}
              className={`p-3 sm:p-5 rounded-lg border-2 transition-all duration-200 active:scale-[0.98] ${
                i18n.language === "ko"
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <span className="text-2xl sm:text-4xl mb-1 sm:mb-2 block text-center">
                🇰🇷
              </span>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white text-center">
                {t("languages.korean")}
              </p>
            </button>
            <button
              onClick={() => i18n.changeLanguage("en")}
              className={`p-3 sm:p-5 rounded-lg border-2 transition-all duration-200 active:scale-[0.98] ${
                i18n.language === "en"
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <span className="text-2xl sm:text-4xl mb-1 sm:mb-2 block text-center">
                🇺🇸
              </span>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white text-center">
                {t("languages.english")}
              </p>
            </button>
            <button
              onClick={() => i18n.changeLanguage("ja")}
              className={`p-3 sm:p-5 rounded-lg border-2 transition-all duration-200 active:scale-[0.98] ${
                i18n.language === "ja"
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <span className="text-2xl sm:text-4xl mb-1 sm:mb-2 block text-center">
                🇯🇵
              </span>
              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white text-center">
                {t("languages.japanese")}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
