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
  Shield,
  Crown,
} from "lucide-react";
import { useSettings, type ImportPreviewData } from "../hooks/useSettings";
import { GeneralSettings } from "./settings/GeneralSettings";
import { AccountSettings } from "./settings/AccountSettings";
import { AppearanceSettings } from "./settings/AppearanceSettings";
import { NotificationSettings } from "./settings/NotificationSettings";
import { StatsSettings } from "./settings/StatsSettings";
import { PrivacySettings } from "./settings/PrivacySettings";
import { BackupSettingsComponent } from "./settings/BackupSettings";
import { SubscriptionSettings } from "./settings/SubscriptionSettings";
import { getUserDefaultPage } from "../firebase";
import { isBetaPeriod } from "../utils/betaFlags";
import { performBackup, shouldBackup } from "../utils/backup";
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
  const { rawBookmarks } = useBookmarkStore();
  const { collections } = useCollectionStore();
  const { theme, setTheme } = useThemeStore();
  const { t } = useTranslation();

  const {
    // 상태
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
    fileInputRef,

    // 핸들러
    handleThemeChange,
    handleNotificationToggle,
    handleSystemNotificationToggle,
    handleTestNotification,
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
    handleImportData,
    handleFileUpload,
    handleConfirmImport,
    handleCancelImport,
    handleDeleteAccount,
    handleConfirmDeleteAccount,
    handleNavigateToNotifications,

    // 기타
    syncBackups,
    i18n,
  } = useSettings({
    user,
    rawBookmarks,
    collections,
    theme,
    setTheme,
    logout,
    onImportData,
    onRestoreBackup,
    isRestoring,
  });

  // 백업 자동 실행 useEffect
  useEffect(() => {
    const backupIntervalRef = { current: null as NodeJS.Timeout | null };

    if (
      backupSettings.enabled &&
      user?.uid &&
      rawBookmarks &&
      collections &&
      rawBookmarks.length > 0 &&
      collections.length > 0
    ) {
      const intervalMs = 10000; // 테스트용 10초 간격

      if (shouldBackup()) {
        const created = performBackup(rawBookmarks, collections, user.uid);
        if (created) syncBackups();
      }

      backupIntervalRef.current = setInterval(() => {
        if (shouldBackup()) {
          const created = performBackup(rawBookmarks, collections, user.uid);
          if (created) syncBackups();
        }
      }, intervalMs);
    }

    return () => {
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
      }
    };
  }, [
    backupSettings.enabled,
    backupSettings.frequency,
    user?.uid,
    rawBookmarks,
    collections,
    syncBackups,
  ]);

  // 백업 탭 진입 시 동기화
  useEffect(() => {
    if (activeTab === "backup") {
      syncBackups();
    }
  }, [activeTab, syncBackups]);

  // 사용자 기본 페이지 로드
  useEffect(() => {
    if (user?.uid) {
      getUserDefaultPage(user.uid).then((page) => {
        if (page) {
          setDefaultPage(page);
        }
      });
    }
  }, [user?.uid, setDefaultPage]);

  const tabs = [
    { id: "general", label: t("settings.general"), icon: SettingsIcon },
    // 베타 모드일 때는 구독 탭 숨김
    ...(!isBetaPeriod()
      ? [{ id: "subscription", label: t("premium.subscription"), icon: Crown }]
      : []),
    { id: "stats", label: t("admin.statistics"), icon: BarChart3 },
    { id: "backup", label: t("settings.backup"), icon: Download },
    { id: "account", label: t("settings.account"), icon: User },
    { id: "appearance", label: t("settings.appearance"), icon: Palette },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
    { id: "privacy", label: t("settings.privacy"), icon: Shield },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralSettings
            defaultPage={defaultPage}
            onDefaultPageChange={handleDefaultPageChange}
            onExportData={handleExportData}
            onImportData={handleImportData}
          />
        );
      case "subscription":
        return <SubscriptionSettings />;
      case "stats":
        return (
          <StatsSettings bookmarks={rawBookmarks} collections={collections} />
        );
      case "backup":
        return (
          <BackupSettingsComponent
            backupSettings={backupSettings}
            backupStatus={backupStatus}
            backups={backups}
            onAutoBackupToggle={handleAutoBackupToggle}
            onBackupFrequencyChange={handleBackupFrequencyChange}
            onManualBackup={handleManualBackup}
            onBackupRestore={handleBackupRestore}
            onBackupDelete={handleBackupDelete}
          />
        );
      case "account":
        return (
          <AccountSettings
            user={user}
            onLogout={logout}
            onDeleteAccount={handleDeleteAccount}
          />
        );
      case "appearance":
        return (
          <AppearanceSettings
            theme={theme}
            onThemeChange={handleThemeChange}
            i18n={i18n}
          />
        );
      case "notifications":
        return (
          <NotificationSettings
            notifications={notifications}
            systemNotifications={systemNotifications}
            browserNotificationPermission={browserNotificationPermission}
            onNotificationToggle={handleNotificationToggle}
            onSystemNotificationToggle={handleSystemNotificationToggle}
            onTestNotification={handleTestNotification}
            onNavigateToNotifications={handleNavigateToNotifications}
          />
        );
      case "privacy":
        return <PrivacySettings />;
      default:
        return (
          <GeneralSettings
            defaultPage={defaultPage}
            onDefaultPageChange={handleDefaultPageChange}
            onExportData={handleExportData}
            onImportData={handleImportData}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-2">
                <SettingsIcon className="w-6 h-6 text-brand-600" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t("settings.title")}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 사이드바 */}
          <div className="lg:w-72 flex-shrink-0">
            {/* 모바일: 가로 스크롤 */}
            <nav className="block lg:hidden overflow-x-auto -mx-4 px-4 scrollbar-hide bg-white dark:bg-gray-800 rounded-lg py-2">
              <div className="flex gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-3 px-4 py-3 whitespace-nowrap rounded-lg transition-colors flex-shrink-0 ${
                        activeTab === tab.id
                          ? "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
            {/* 데스크톱: 기존 세로 레이아웃 */}
            <nav className="hidden lg:block space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1">{renderContent()}</div>
        </div>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      {/* 데이터 가져오기 확인 모달 */}
      {showImportModal && importData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              데이터 가져오기 확인
            </h3>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  이 파일에는 다음 데이터가 포함되어 있습니다:
                </p>
                <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 북마크: {importData.bookmarks.length}개</li>
                  <li>• 컬렉션: {importData.collections.length}개</li>
                  <li>
                    • 내보내기 날짜:{" "}
                    {importData.exportedAt
                      ? new Date(importData.exportedAt).toLocaleDateString()
                      : "정보 없음"}
                  </li>
                </ul>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>주의:</strong> 기존 데이터와 병합됩니다. 중복된
                  북마크나 컬렉션은 추가되지 않습니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelImport}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                가져오기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 백업 복원 확인 모달 */}
      {restoreConfirm.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isRestoring ? "백업 복원 중..." : "백업 복원 확인"}
            </h3>
            {isRestoring ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                </div>
                <p className="text-gray-700 dark:text-gray-200 text-center">
                  백업 데이터를 복원하고 있습니다. 잠시만 기다려주세요...
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-700 dark:text-gray-200 mb-6">
                  이 백업으로 데이터를 복원하시겠습니까? 현재 데이터는
                  덮어써집니다.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCancelRestore}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmRestore}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                  >
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              백업 삭제 확인
            </h3>
            <p className="text-gray-700 dark:text-gray-200 mb-6">
              이 백업을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계정 삭제 모달 */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xs">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              계정 삭제
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
