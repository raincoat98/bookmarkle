import React, { useEffect } from "react";
import {
  useAuthStore,
  useBookmarkStore,
  useCollectionStore,
  useThemeStore,
} from "../stores";
import { useTranslation } from "react-i18next";
import {
  Settings as SettingsIcon,
  X,
  BarChart3,
  Download,
  User,
  Palette,
  Bell,
  Crown,
  Trash2,
} from "lucide-react";
import { useSettings, type ImportPreviewData } from "../hooks/useSettings";
import { useFeatureFlagsStore } from "../stores";
import { GeneralSettings } from "./settings/GeneralSettings";
import { AccountSettings } from "./settings/AccountSettings";
import { AppearanceSettings } from "./settings/AppearanceSettings";
import { NotificationSettings } from "./settings/NotificationSettings";
import { StatsSettings } from "./settings/StatsSettings";
import { BackupSettingsComponent } from "./settings/BackupSettings";
import { SubscriptionSettings } from "./settings/SubscriptionSettings";
import { TrashSettings } from "./settings/TrashSettings";
import { getUserDefaultPage, auth } from "../firebase";
import { isBetaPeriod } from "../utils/betaFlags";
import { calcChecksum } from "../utils/backup";
import type { Bookmark, Collection } from "../types";

interface SettingsProps {
  onBack: () => void;
  onImportData?: (importData: ImportPreviewData) => Promise<void>;
  onRestoreBackup?: (backupData: {
    bookmarks: Bookmark[];
    collections: Collection[];
  }) => Promise<void>;
  isRestoring?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({
  onBack,
  onImportData,
  onRestoreBackup,
  isRestoring = false,
}) => {
  const { user, logout } = useAuthStore();
  useFeatureFlagsStore((s) => s.flags);
  const { rawBookmarks } = useBookmarkStore();
  const { collections } = useCollectionStore();
  const { theme, setTheme } = useThemeStore();
  const { t } = useTranslation();

  const {
    activeTab,
    setActiveTab,
    notifications,
    systemNotifications,
    browserNotificationPermission,
    backupSettings,
    backupStatus,
    backups,
    defaultPage,
    setDefaultPage,
    showImportModal,
    importData,
    restoreConfirm,
    deleteConfirm,
    showDeleteAccountModal,
    setShowDeleteAccountModal,
    deletionStatus,
    fileInputRef,
    handleThemeChange,
    handleNotificationToggle,
    handleSystemNotificationToggle,
    handleAutoBackupToggle,
    handleBackupFrequencyChange,
    handleManualBackup,
    handleBackupRestore,
    handleConfirmRestore,
    handleCancelRestore,
    handleBackupDelete,
    handleConfirmDelete,
    handleCancelDelete,
    handleDefaultPageChange,
    handleExportData,
    handleExportChromeBookmarks,
    handleImportData,
    handleImportChromeBookmarks,
    handleFileUpload,
    handleChromeBookmarkFileUpload,
    handleConfirmImport,
    handleCancelImport,
    handleUpdateProfile,
    handleDeleteAccount,
    handleConfirmDeleteAccount,
    handleCancelDeletion,
    handleNavigateToNotifications,
    syncBackups,
    i18n,
    chromeBookmarkFileInputRef,
  } = useSettings({
    user,
    rawBookmarks,
    collections,
    theme,
    setTheme,
    onImportData,
    onRestoreBackup,
    isRestoring,
  });

  // 자동 백업은 App.tsx의 전역 useEffect가 담당 (중복 실행 방지)

  useEffect(() => {
    if (activeTab === "backup") syncBackups();
  }, [activeTab, syncBackups]);

  useEffect(() => {
    if (user?.uid && auth.currentUser?.uid === user.uid) {
      getUserDefaultPage(user.uid)
        .then((page: string | null) => { if (page) setDefaultPage(page); })
        .catch(() => {});
    }
  }, [user?.uid, setDefaultPage]);

  const tabs = [
    { id: "general",       label: t("settings.general"),          icon: SettingsIcon },
    ...(!isBetaPeriod() ? [{ id: "subscription", label: t("premium.subscriptionLabel"), icon: Crown }] : []),
    { id: "stats",         label: t("settings.statistics"),       icon: BarChart3 },
    { id: "backup",        label: t("settings.backup"),           icon: Download },
    { id: "trash",         label: t("settings.trash"),            icon: Trash2 },
    { id: "account",       label: t("settings.account"),          icon: User },
    { id: "appearance",    label: t("settings.appearance"),       icon: Palette },
    { id: "notifications", label: t("settings.notifications"),    icon: Bell },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralSettings
            defaultPage={defaultPage}
            onDefaultPageChange={handleDefaultPageChange}
            onExportData={handleExportData}
            onExportChromeBookmarks={handleExportChromeBookmarks}
            onImportData={handleImportData}
            onImportChromeBookmarks={handleImportChromeBookmarks}
          />
        );
      case "subscription": return <SubscriptionSettings />;
      case "stats":        return <StatsSettings bookmarks={rawBookmarks} collections={collections} />;
      case "backup":
        return (
          <BackupSettingsComponent
            backupSettings={backupSettings}
            backupStatus={backupStatus}
            backups={backups}
            currentChecksum={calcChecksum(rawBookmarks ?? [], collections ?? [])}
            onAutoBackupToggle={handleAutoBackupToggle}
            onBackupFrequencyChange={handleBackupFrequencyChange}
            onManualBackup={handleManualBackup}
            onRefreshBackups={syncBackups}
            onBackupRestore={handleBackupRestore}
            onBackupDelete={handleBackupDelete}
          />
        );
      case "account":
        return (
          <AccountSettings
            user={user}
            onLogout={logout}
            onUpdateProfile={handleUpdateProfile}
            onDeleteAccount={handleDeleteAccount}
            deletionStatus={deletionStatus}
            onCancelDeletion={handleCancelDeletion}
          />
        );
      case "appearance":
        return <AppearanceSettings theme={theme} onThemeChange={handleThemeChange} i18n={i18n} />;
      case "notifications":
        return (
          <NotificationSettings
            notifications={notifications}
            systemNotifications={systemNotifications}
            browserNotificationPermission={browserNotificationPermission}
            onNotificationToggle={handleNotificationToggle}
            onSystemNotificationToggle={handleSystemNotificationToggle}
            onNavigateToNotifications={handleNavigateToNotifications}
          />
        );
      case "trash":   return <TrashSettings />;
      default:
        return (
          <GeneralSettings
            defaultPage={defaultPage}
            onDefaultPageChange={handleDefaultPageChange}
            onExportData={handleExportData}
            onExportChromeBookmarks={handleExportChromeBookmarks}
            onImportData={handleImportData}
            onImportChromeBookmarks={handleImportChromeBookmarks}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d10]">
      {/* 헤더 */}
      <div className="sticky top-0 z-50 h-14 lg:h-[80px] px-4 lg:px-6 border-b border-gray-100 dark:border-white/[0.06] bg-white/80 dark:bg-[#111113]/90 backdrop-blur-md flex items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("settings.title")}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* 사이드바 */}
          <div className="lg:w-56 flex-shrink-0">
            {/* 모바일: 가로 스크롤 */}
            <nav className="block lg:hidden overflow-x-auto -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-1 pb-1 p-1 bg-gray-100/80 dark:bg-white/[0.04] rounded-xl w-max">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors flex-shrink-0 ${
                        active
                          ? "bg-white dark:bg-white/[0.08] text-violet-600 dark:text-violet-400 shadow-sm"
                          : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-medium whitespace-nowrap">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* 데스크톱: 세로 목록 */}
            <nav className="hidden lg:block space-y-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl transition-colors ${
                      active
                        ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-w-0">{renderContent()}</div>
        </div>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
      <input ref={chromeBookmarkFileInputRef} type="file" accept=".html" onChange={handleChromeBookmarkFileUpload} className="hidden" />

      {/* 데이터 가져오기 확인 모달 */}
      {showImportModal && importData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              데이터 가져오기 확인
            </h3>
            <div className="space-y-3 mb-5">
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-4">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">포함된 데이터</p>
                <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  <li>북마크 {importData.bookmarks.length}개</li>
                  <li>컬렉션 {importData.collections.length}개</li>
                  {importData.exportedAt && (
                    <li>내보내기: {new Date(importData.exportedAt).toLocaleDateString()}</li>
                  )}
                </ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl p-4">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  기존 데이터와 병합됩니다. 중복된 항목은 추가되지 않습니다.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCancelImport} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors">
                {t("common.cancel")}
              </button>
              <button onClick={handleConfirmImport} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors">
                가져오기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 백업 복원 확인 모달 */}
      {restoreConfirm.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {isRestoring ? "백업 복원 중..." : "백업 복원 확인"}
            </h3>
            {isRestoring ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-violet-200 border-t-violet-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  백업 데이터를 복원하고 있습니다...
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  이 백업으로 데이터를 복원하시겠습니까? 현재 데이터는 덮어써집니다.
                </p>
                <div className="flex gap-2">
                  <button onClick={handleCancelRestore} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors">
                    {t("common.cancel")}
                  </button>
                  <button onClick={handleConfirmRestore} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors">
                    확인
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 백업 삭제 확인 모달 */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">백업 삭제 확인</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              이 백업을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button onClick={handleCancelDelete} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors">
                {t("common.cancel")}
              </button>
              <button onClick={handleConfirmDelete} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계정 삭제 모달 */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => setShowDeleteAccountModal(false)}>
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t("settings.deleteAccount")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              {t("settings.deleteAccountDescription")}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteAccountModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors">
                {t("common.cancel")}
              </button>
              <button onClick={handleConfirmDeleteAccount} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors">
                {t("settings.deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
