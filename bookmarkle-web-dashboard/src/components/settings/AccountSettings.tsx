import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Key, Shield, ChevronRight, ChevronLeft, Pencil, Check, LogOut } from "lucide-react";
import { isAdminUser } from "../../firebase";
import type { User } from "firebase/auth";
import { PrivacySettings } from "./PrivacySettings";

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
    if (user) isAdminUser(user).then(setIsAdmin);
    else setIsAdmin(false);
  }, [user]);

  useEffect(() => {
    setEditName(user?.displayName || "");
  }, [user?.displayName]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await onLogout();
      navigate("/", { replace: true });
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === user?.displayName) { setIsEditing(false); return; }
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
    <div className="space-y-3">
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        {!showDetail ? (
          <>
            {/* 프로필 */}
            <div className="flex items-center gap-4 px-5 py-5 border-b border-gray-50 dark:border-white/[0.04]">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="h-12 w-12 rounded-full flex-shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                    {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.displayName || t("settings.user")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* 액션 목록 */}
            <div className="px-2 pb-2 pt-1 space-y-0.5">
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-red-50 dark:hover:bg-red-500/[0.06] transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-red-500 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-red-500 dark:text-red-400">{t("admin.title")}</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-40"
              >
                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isLoggingOut ? "로그아웃 중..." : t("auth.logout")}
                </span>
              </button>
              <button
                onClick={() => setShowDetail(true)}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <Key className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">계정 상세</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 상세 헤더 */}
            <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-50 dark:border-white/[0.04]">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                뒤로
              </button>
              <span className="text-sm font-semibold text-gray-900 dark:text-white ml-1">
                계정 상세
              </span>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* 이름 수정 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  이름 수정
                </p>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setIsEditing(false); setEditName(user?.displayName || ""); }}
                        className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSaveName}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-white/[0.04] rounded-xl">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user?.displayName || t("settings.user")}
                    </span>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      <Pencil className="w-3 h-3" />
                      수정
                    </button>
                  </div>
                )}
              </div>

              {/* 계정 삭제 */}
              <div className="flex justify-end pt-4 border-t border-gray-50 dark:border-white/[0.04]">
                {deletionStatus?.isScheduled && deletionStatus.deletionDate ? (
                  <div className="text-right">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                      {t("settings.accountDeletionScheduledDescription", {
                        date: deletionStatus.deletionDate.toLocaleDateString(
                          i18n.language === "ko" ? "ko-KR" : i18n.language === "ja" ? "ja-JP" : "en-US",
                          { year: "numeric", month: "long", day: "numeric" }
                        ),
                      })}
                    </p>
                    <button onClick={onCancelDeletion} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
                      {t("settings.cancelDeletion")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onDeleteAccount}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    {t("settings.deleteAccount")}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {!showDetail && <PrivacySettings />}
    </div>
  );
};
