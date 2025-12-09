import React from "react";
import { useTranslation } from "react-i18next";
import { AdminUserList } from "./AdminUserList";
import type { AdminUser } from "../../types";

interface AdminUserManagementProps {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onToggleUserStatus: (uid: string, isActive: boolean) => Promise<void>;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  users,
  loading,
  error,
  onRefetch,
  onToggleUserStatus,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-4 sm:p-6">
      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-red-800 dark:text-red-200 flex-1">
              {error}
            </p>
            <button
              onClick={onRefetch}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium whitespace-nowrap"
            >
              {t("admin.retry")}
            </button>
          </div>
        </div>
      )}

      {/* 사용자 목록 */}
      <AdminUserList
        users={users}
        loading={loading}
        onToggleUserStatus={onToggleUserStatus}
      />
    </div>
  );
};
