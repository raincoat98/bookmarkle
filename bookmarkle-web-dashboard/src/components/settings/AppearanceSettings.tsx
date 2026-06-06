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
  { code: "ko", label: "한국어", sub: "Korean"  },
  { code: "en", label: "English", sub: "영어"   },
  { code: "ja", label: "日本語",  sub: "일본어" },
] as const;

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  onThemeChange,
  i18n,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* 테마 */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t("settings.theme")}
          </p>
        </div>
        <div className="px-4 pb-4">
          <div className="flex gap-1 p-1 bg-gray-50 dark:bg-white/[0.04] rounded-xl">
            {THEMES.map(({ value, icon: Icon, labelKey }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => onThemeChange(value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t("settings.language")}
          </p>
        </div>
        <div className="px-2 pb-2 space-y-0.5">
          {LANGUAGES.map(({ code, label, sub }) => {
            const active = i18n.language === code;
            return (
              <button
                key={code}
                onClick={() => i18n.changeLanguage(code)}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {sub}
                  </span>
                </div>
                {active && (
                  <Check className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
