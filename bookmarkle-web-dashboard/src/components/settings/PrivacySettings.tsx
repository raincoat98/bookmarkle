import React from "react";
import { useTranslation } from "react-i18next";

export const PrivacySettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t("settings.privacy")}
          </p>
        </div>
        <div className="px-5 pb-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {t("settings.privacyDescription")}
          </p>
        </div>
      </div>
    </div>
  );
};
