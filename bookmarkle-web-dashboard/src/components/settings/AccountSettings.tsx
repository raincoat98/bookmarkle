import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Key,
  Trash2,
  Shield,
  X,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Check,
} from "lucide-react";
import { isAdminUser } from "../../firebase";
import type { User } from "firebase/auth";

interface AccountSettingsProps {
  user: User | null;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => void;
  onUpdateProfile: (displayName: string) => Promise<void>;
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
  onUpdateProfile,
  deletionStatus,
  onCancelDeletion,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      isAdminUser(user).then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    setEditName(user?.displayName || "");
  }, [user?.displayName]);

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

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === user?.displayName) {
      setIsEditing(false);
      return;
    }
    try {
      setIsSaving(true);
      await onUpdateProfile(trimmed);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setShowDetail(false);
    setIsEditing(false);
    setEditName(user?.displayName || "");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!showDetail ? (
          /* ── 메인 뷰 ── */
          <>
            {/* 프로필 */}
            <div className="flex items-center space-x-4 p-6">
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

            {/* 액션 버튼 */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 space-y-3">
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

            {/* 상세 → 네비게이션 행 */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowDetail(true)}
                className="w-full flex items-center justify-between px-6 py-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span>상세</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </>
        ) : (
          /* ── 상세 뷰 ── */
          <>
            {/* 상세 헤더 */}
            <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                뒤로
              </button>
              <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                계정 상세
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* 이름 수정 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  이름 수정
                </p>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveName}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(user?.displayName || "");
                        }}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user?.displayName || t("settings.user")}
                    </span>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      <Pencil className="w-3 h-3" />
                      수정
                    </button>
                  </div>
                )}
              </div>

              {/* 위험 영역 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-3">
                  {t("settings.dangerZone")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {t("settings.dangerZoneDescription")}
                </p>
                {deletionStatus?.isScheduled && deletionStatus.deletionDate ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                      {t("settings.accountDeletionScheduledDescription", {
                        date: deletionStatus.deletionDate.toLocaleDateString(
                          i18n.language === "ko"
                            ? "ko-KR"
                            : i18n.language === "ja"
                            ? "ja-JP"
                            : "en-US",
                          { year: "numeric", month: "long", day: "numeric" }
                        ),
                      })}
                    </p>
                    <button
                      onClick={onCancelDeletion}
                      className="w-full flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("settings.cancelDeletion")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onDeleteAccount}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("settings.deleteAccount")}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
