import { useTranslation } from "react-i18next";
import { UserX, Mail } from "lucide-react";

export function DisabledUserMessage() {
  const { t } = useTranslation();
  
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
        <UserX className="w-12 h-12 text-red-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {t("common.accountDisabled")}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {t("common.accountDisabledDesc")}
      </p>
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
        <Mail className="w-4 h-4" />
        <span>{t("common.contactAdmin")}</span>
      </div>
    </div>
  );
}
