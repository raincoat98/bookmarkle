import React from "react";
import { useTranslation } from "react-i18next";

export const PrivacySettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("settings.privacy")}
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t("settings.privacyDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
