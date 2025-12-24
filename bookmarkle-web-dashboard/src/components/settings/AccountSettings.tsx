import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Key, Trash2, Shield, X } from "lucide-react";
import { isAdminUser } from "../../firebase";
import type { User } from "firebase/auth";

interface AccountSettingsProps {
  user: User | null;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => void;
  deletionStatus: {
    isScheduled: boolean;
    deletionDate: Date | null;
  } | null;
  onCancelDeletion: () => Promise<void>;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  user,
  onLogout,
  onDeleteAccount,
  deletionStatus,
  onCancelDeletion,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      isAdminUser(user).then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      await onLogout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("settings.accountInfo")}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="h-16 w-16 rounded-full"
              />
            )}
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {user?.displayName || t("settings.user")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("settings.accountManagement")}
        </h3>
        <div className="space-y-4">
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Shield className="w-4 h-4 mr-2" />
              {t("admin.title")}
            </button>
          )}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Key className="w-4 h-4 mr-2" />
            {isLoggingOut ? "로그아웃 중..." : t("auth.logout")}
          </button>
        </div>
      </div>

      {/* 위험 영역 - 계정 삭제 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 border-red-200 dark:border-red-900/50 p-6 mt-8">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            {t("settings.dangerZone")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("settings.dangerZoneDescription")}
          </p>
        </div>
        <div className="pt-4 border-t border-red-200 dark:border-red-900/30 space-y-4">
          {deletionStatus?.isScheduled && deletionStatus.deletionDate ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                {t("settings.accountDeletionScheduledDescription", {
                  date: deletionStatus.deletionDate.toLocaleDateString(
                    i18n.language === "ko"
                      ? "ko-KR"
                      : i18n.language === "ja"
                      ? "ja-JP"
                      : "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  ),
                })}
              </p>
              <button
                onClick={onCancelDeletion}
                className="w-full flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                {t("settings.cancelDeletion")}
              </button>
            </div>
          ) : (
            <button
              onClick={onDeleteAccount}
              className="w-full flex items-center justify-center px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("settings.deleteAccount")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
