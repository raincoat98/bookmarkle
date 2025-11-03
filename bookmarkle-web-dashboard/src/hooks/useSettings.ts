import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../node_modules/react-i18next";
import toast from "react-hot-toast";
import {
  getNotificationPermission,
  requestNotificationPermission,
  showTestNotification,
} from "../utils/browserNotifications";
import {
  setUserDefaultPage,
  getUserNotificationSettings,
  setUserNotificationSettings,
} from "../firebase";
import {
  loadBackupSettings,
  saveBackupSettings,
  performBackup,
  getAllBackups,
  getBackupStatus,
  deleteBackup,
  type BackupSettings,
} from "../utils/backup";
import type { Bookmark, Collection } from "../types";

interface UseSettingsProps {
  user: any;
  rawBookmarks: Bookmark[];
  collections: Collection[];
  theme: string;
  setTheme: (theme: "light" | "dark" | "auto") => void;
  logout: () => void;
  onImportData?: (importData: any) => Promise<void>;
  onRestoreBackup?: (backupData: {
    bookmarks: Bookmark[];
    collections: Collection[];
  }) => Promise<void>;
  isRestoring?: boolean;
}

export const useSettings = ({
  user,
  rawBookmarks,
  collections,
  setTheme,
  logout,
  onImportData,
  onRestoreBackup,
  isRestoring = false,
}: UseSettingsProps) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 상태 관리
  const [activeTab, setActiveTab] = useState("general");
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("notifications");
    return saved ? JSON.parse(saved) : true;
  });
  const [bookmarkNotifications, setBookmarkNotifications] = useState(() => {
    const saved = localStorage.getItem("bookmarkNotifications");
    return saved ? JSON.parse(saved) : true;
  });

  // Firestore에서 알림 설정 로드
  useEffect(() => {
    if (user?.uid) {
      getUserNotificationSettings(user.uid)
        .then((settings) => {
          if (settings.notifications !== undefined) {
            setNotifications(settings.notifications);
            localStorage.setItem(
              "notifications",
              JSON.stringify(settings.notifications)
            );
          }
          if (settings.bookmarkNotifications !== undefined) {
            setBookmarkNotifications(settings.bookmarkNotifications);
            localStorage.setItem(
              "bookmarkNotifications",
              JSON.stringify(settings.bookmarkNotifications)
            );
          }
        })
        .catch((error) => {
          console.error("알림 설정 로드 실패:", error);
        });
    }
  }, [user?.uid]);
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState(() => getNotificationPermission());
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() =>
    loadBackupSettings()
  );
  const [backupStatus, setBackupStatus] = useState(() => getBackupStatus());
  const [defaultPage, setDefaultPage] = useState(
    () => localStorage.getItem("defaultPage") || "dashboard"
  );
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<{
    open: boolean;
    timestamp: string | null;
  }>({ open: false, timestamp: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    timestamp: string | null;
  }>({ open: false, timestamp: null });
  const [backups, setBackups] = useState(() => getAllBackups());
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // 백업 동기화 함수
  const syncBackups = () => {
    setBackups(getAllBackups());
    setBackupStatus(getBackupStatus());
  };

  // 테마 변경 핸들러
  const handleThemeChange = (newTheme: "light" | "dark" | "auto") => {
    setTheme(newTheme);
    const themeText =
      newTheme === "dark" ? "다크" : newTheme === "auto" ? "자동" : "라이트";
    toast.success(`테마가 ${themeText} 모드로 변경되었습니다.`);
  };

  // 알림 토글 핸들러
  const handleNotificationToggle = async () => {
    if (!notifications) {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        const newValue = true;
        setNotifications(newValue);
        setBrowserNotificationPermission(getNotificationPermission());
        localStorage.setItem("notifications", JSON.stringify(newValue));
        // Firestore에 저장
        if (user?.uid) {
          await setUserNotificationSettings(user.uid, {
            notifications: newValue,
          });
        }
        toast.success("브라우저 알림이 활성화되었습니다.");
      } else {
        toast.error(
          "브라우저 알림 권한이 필요합니다. 브라우저 설정에서 권한을 허용해주세요."
        );
      }
    } else {
      const newValue = false;
      setNotifications(newValue);
      localStorage.setItem("notifications", JSON.stringify(newValue));
      // Firestore에 저장
      if (user?.uid) {
        await setUserNotificationSettings(user.uid, {
          notifications: newValue,
        });
      }
      toast.success("브라우저 알림이 비활성화되었습니다.");
    }
  };

  // 테스트 알림 핸들러
  const handleTestNotification = async () => {
    const hasPermission = await requestNotificationPermission();
    if (hasPermission) {
      showTestNotification(
        t("notifications.testNotificationTitle"),
        t("notifications.testNotificationMessage")
      );
      toast.success(
        t("notifications.testNotification") + " " + t("common.success")
      );
    } else {
      toast.error(t("notifications.permissionDenied"));
    }
  };

  // 북마크 알림 토글 핸들러
  const handleBookmarkNotificationToggle = async () => {
    const newValue = !bookmarkNotifications;
    setBookmarkNotifications(newValue);
    localStorage.setItem("bookmarkNotifications", JSON.stringify(newValue));

    // Firestore에 저장
    if (user?.uid) {
      await setUserNotificationSettings(user.uid, {
        bookmarkNotifications: newValue,
      });
    }

    window.dispatchEvent(
      new CustomEvent("bookmarkNotificationsChanged", {
        detail: { enabled: newValue },
      })
    );

    toast.success(
      `북마크 알림이 ${newValue ? "활성화" : "비활성화"}되었습니다.`
    );
  };

  // 자동 백업 토글 핸들러
  const handleAutoBackupToggle = () => {
    const newSettings = { ...backupSettings, enabled: !backupSettings.enabled };
    setBackupSettings(newSettings);
    saveBackupSettings(newSettings);
    setBackupStatus(getBackupStatus());
    toast.success(
      `자동 백업이 ${
        !backupSettings.enabled ? "활성화" : "비활성화"
      }되었습니다.`
    );

    if (!backupSettings.enabled && user?.uid) {
      const created = performBackup(rawBookmarks, collections, user.uid);
      if (created) syncBackups();
    }
  };

  // 백업 주기 변경 핸들러
  const handleBackupFrequencyChange = (
    frequency: "daily" | "weekly" | "monthly"
  ) => {
    const newSettings = { ...backupSettings, frequency };
    setBackupSettings(newSettings);
    saveBackupSettings(newSettings);
    setBackupStatus(getBackupStatus());
    toast.success(
      `백업 주기가 ${
        frequency === "daily"
          ? "매일"
          : frequency === "weekly"
          ? "매주"
          : "매월"
      }로 변경되었습니다.`
    );
  };

  // 수동 백업 핸들러
  const handleManualBackup = () => {
    if (
      user?.uid &&
      rawBookmarks &&
      collections &&
      (rawBookmarks.length > 0 || collections.length > 0)
    ) {
      const created = performBackup(rawBookmarks, collections, user.uid);
      if (created) {
        syncBackups();
        toast.success("새 백업이 생성되었습니다.");
      } else {
        toast.error("백업할 데이터가 없습니다.");
      }
    }
  };

  // 백업 복원 핸들러
  const handleBackupRestore = async (timestamp: string) => {
    setRestoreConfirm({ open: true, timestamp });
  };

  const handleConfirmRestore = async () => {
    if (!restoreConfirm.timestamp) return;

    if (isRestoring) {
      console.log("이미 복원 중입니다.");
      return;
    }
    try {
      const latest = getAllBackups();
      const backupData = latest.find(
        (b) => b.timestamp === restoreConfirm.timestamp
      )?.data;
      if (backupData && onRestoreBackup) {
        await onRestoreBackup(backupData);
        toast.success("백업이 성공적으로 복원되었습니다.");
      } else if (!onRestoreBackup) {
        console.error("onRestoreBackup prop이 전달되지 않았습니다.");
        toast.error("복원 핸들러가 없습니다. 관리자에게 문의하세요.");
      } else {
        toast.error("이미 삭제된 백업입니다.");
        syncBackups();
      }
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("백업 복원 중 오류가 발생했습니다.");
    } finally {
      setRestoreConfirm({ open: false, timestamp: null });
      syncBackups();
    }
  };

  const handleCancelRestore = () => {
    setRestoreConfirm({ open: false, timestamp: null });
  };

  // 백업 삭제 핸들러
  const handleBackupDelete = (timestamp: string) => {
    setDeleteConfirm({ open: true, timestamp });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm.timestamp) return;

    deleteBackup(deleteConfirm.timestamp);
    syncBackups();
    toast.success("백업이 삭제되었습니다.");
    setDeleteConfirm({ open: false, timestamp: null });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ open: false, timestamp: null });
  };

  // 기본 페이지 변경 핸들러
  const handleDefaultPageChange = async (page: string) => {
    setDefaultPage(page);
    if (user?.uid) {
      await setUserDefaultPage(user.uid, page);
    }
    localStorage.setItem("defaultPage", page);
    window.dispatchEvent(new Event("localStorageChange"));
    toast.success(
      `기본 페이지가 ${
        page === "dashboard" ? "대시보드" : "북마크 목록"
      }으로 설정되었습니다.`
    );
    if (page === "bookmarks") {
      navigate("/bookmarks");
    } else {
      navigate("/");
    }
  };

  // 데이터 내보내기 핸들러
  const handleExportData = () => {
    try {
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        bookmarks: rawBookmarks,
        collections: collections,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bookmarkhub-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("북마크 데이터가 내보내졌습니다.");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("데이터 내보내기 중 오류가 발생했습니다.");
    }
  };

  // 데이터 가져오기 핸들러
  const handleImportData = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsedData = JSON.parse(text);

      if (!parsedData.bookmarks || !parsedData.collections) {
        toast.error("잘못된 파일 형식입니다.");
        return;
      }

      setImportData(parsedData);
      setShowImportModal(true);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("파일 읽기 중 오류가 발생했습니다.");
    }

    if (event.target) {
      event.target.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!importData || !onImportData) return;

    try {
      await onImportData(importData);
      setShowImportModal(false);
      setImportData(null);
      toast.success("데이터 가져오기가 완료되었습니다.");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("데이터 가져오기 중 오류가 발생했습니다.");
    }
  };

  const handleCancelImport = () => {
    setShowImportModal(false);
    setImportData(null);
  };

  // 계정 삭제 핸들러
  const handleDeleteAccount = () => {
    setShowDeleteAccountModal(true);
  };

  const handleConfirmDeleteAccount = () => {
    toast.success("계정이 삭제되었습니다.");
    setShowDeleteAccountModal(false);
    logout();
  };

  // 알림 센터로 이동 핸들러
  const handleNavigateToNotifications = () => {
    navigate("/notifications");
  };

  return {
    // 상태
    activeTab,
    setActiveTab,
    notifications,
    bookmarkNotifications,
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
    handleTestNotification,
    handleBookmarkNotificationToggle,
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
  };
};
