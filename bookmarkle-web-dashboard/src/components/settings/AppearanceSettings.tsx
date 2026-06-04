import React from "react";
import { useTranslation } from "react-i18next";
import type { i18n as I18nType } from "i18next";
import { Sun, Moon, Monitor, Check } from "lucide-react";

interface AppearanceSettingsProps {
  theme: string;
  onThemeChange: (theme: "light" | "dark" | "auto") => void;
  i18n: I18nType;
}

const THEMES = [
  { value: "light", icon: Sun,     labelKey: "settings.themeLight"  },
  { value: "dark",  icon: Moon,    labelKey: "settings.themeDark"   },
  { value: "auto",  icon: Monitor, labelKey: "settings.themeSystem" },
] as const;

const LANGUAGES = [
  { code: "ko", label: "한국어", sub: "Korean"   },
  { code: "en", label: "English", sub: "영어"    },
  { code: "ja", label: "日本語",  sub: "일본어"  },
] as const;

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  onThemeChange,
  i18n,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* 테마 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("settings.theme")}
          </h3>
        </div>
        <div className="p-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900/60 rounded-lg">
            {THEMES.map(({ value, icon: Icon, labelKey }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => onThemeChange(value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{t(labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 언어 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("settings.language")}
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {LANGUAGES.map(({ code, label, sub }) => {
            const active = i18n.language === code;
            return (
              <button
                key={code}
                onClick={() => i18n.changeLanguage(code)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {sub}
                  </span>
                </div>
                {active && (
                  <Check className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
