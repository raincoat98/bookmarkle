import React from "react";
import { useTranslation } from "react-i18next";

export const PrivacySettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("settings.privacy")}
          </h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {t("settings.privacyDescription")}
          </p>
        </div>
      </div>
    </div>
  );
};
