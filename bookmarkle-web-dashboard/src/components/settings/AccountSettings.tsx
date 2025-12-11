import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Key, Trash2, Shield } from "lucide-react";
import { isAdminUser } from "../../firebase";
import type { User } from "firebase/auth";
import { getExtensionId } from "../../utils/extensionId";

interface AccountSettingsProps {
  user: User | null;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  user,
  onLogout,
  onDeleteAccount,
}) => {
  const { t } = useTranslation();
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
      
      // Extension에 로그아웃 메시지 전송
      try {
        const extensionId = getExtensionId(); 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chromeAPI = (window as any).chrome;
        if (typeof chromeAPI !== "undefined" && chromeAPI.runtime && extensionId) {
          console.log("📤 Sending logout to extension:", extensionId);
          chromeAPI.runtime.sendMessage(extensionId, {
            type: "AUTH_STATE_CHANGED",
            user: null,
          }).then(() => {
            console.log("✅ Logout message sent to extension");
          }).catch((error: Error) => {
            console.log("Extension 로그아웃 메시지 전송 실패:", error.message);
          });
        }
      } catch (error) {
        console.error("Extension 로그아웃 메시지 전송 실패:", error);
      }
      
      await onLogout();
      // Firebase auth state listener will handle the redirect
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
          <button
            onClick={onDeleteAccount}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("settings.deleteAccount")}
          </button>
        </div>
      </div>
    </div>
  );
};
