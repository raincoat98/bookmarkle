import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores";
import { UserX, Mail } from "lucide-react";

export function UserStatusWarning() {
  const { t } = useTranslation();
  const { user, isActive, isActiveLoading } = useAuthStore();

  // 로딩 중이거나 사용자가 없거나 활성화된 경우 표시하지 않음
  if (isActiveLoading || !user || isActive) {
    return null;
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <UserX className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            {t("common.accountDisabled")}
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <p>
              {t("common.accountDisabledDesc")}
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>{t("common.contactAdmin")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
