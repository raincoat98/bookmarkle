import { useState, useRef, useEffect } from "react";
import type { User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import {
  downloadChromeBookmarks,
  parseChromeBookmarks,
  convertChromeBookmarksToAppFormat,
} from "../utils/chromeBookmarks";
import type { Bookmark, Collection } from "../types";

export interface ImportPreviewData {
  version?: string;
  exportedAt?: string;
  bookmarks: Array<Record<string, unknown>>;
  collections: Array<Record<string, unknown>>;
}

const sanitizeImportPreviewData = (data: unknown): ImportPreviewData | null => {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;

  if (!Array.isArray(record.bookmarks) || !Array.isArray(record.collections)) {
    return null;
  }

  return {
    version: typeof record.version === "string" ? record.version : undefined,
    exportedAt:
      typeof record.exportedAt === "string" ? record.exportedAt : undefined,
    bookmarks: record.bookmarks as Array<Record<string, unknown>>,
    collections: record.collections as Array<Record<string, unknown>>,
  };
};

interface UseSettingsProps {
  user: User | null;
  rawBookmarks: Bookmark[];
  collections: Collection[];
  theme: string;
  setTheme: (theme: "light" | "dark" | "auto") => void;
  logout: () => void;
  onImportData?: (importData: ImportPreviewData) => Promise<void>;
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
  const chromeBookmarkFileInputRef = useRef<HTMLInputElement>(null);

  // 상태 관리
  const [activeTab, setActiveTab] = useState("general");
  const getInitialNotificationSetting = (
    key: "notifications" | "systemNotifications",
    fallback?: boolean
  ) => {
    const saved = localStorage.getItem(key);
    if (saved !== null) return JSON.parse(saved);
    if (fallback !== undefined) return fallback;
    const legacy = localStorage.getItem("bookmarkNotifications");
    if (legacy !== null) return JSON.parse(legacy);
    return true;
  };

  const initialRecordNotifications =
    getInitialNotificationSetting("notifications");
  const initialSystemNotifications = getInitialNotificationSetting(
    "systemNotifications",
    initialRecordNotifications
  );

  const [notifications, setNotifications] = useState<boolean>(
    initialRecordNotifications
  );
  const [systemNotifications, setSystemNotifications] = useState<boolean>(
    initialSystemNotifications
  );
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState(() => getNotificationPermission());

  // Firestore에서 알림 설정 로드
  useEffect(() => {
    if (user?.uid) {
      getUserNotificationSettings(user.uid)
        .then((settings) => {
          const firestoreValue =
            settings.notifications !== undefined
              ? settings.notifications
              : settings.bookmarkNotifications;

          const systemValue =
            settings.systemNotifications !== undefined
              ? settings.systemNotifications
              : firestoreValue;

          if (firestoreValue !== undefined) {
            setNotifications(firestoreValue);
            localStorage.setItem(
              "notifications",
              JSON.stringify(firestoreValue)
            );
            localStorage.setItem(
              "bookmarkNotifications",
              JSON.stringify(firestoreValue)
            );
          }

          if (systemValue !== undefined) {
            setSystemNotifications(systemValue);
            localStorage.setItem(
              "systemNotifications",
              JSON.stringify(systemValue)
            );
            setBrowserNotificationPermission(getNotificationPermission());
          }
        })
        .catch((error) => {
          console.error("알림 설정 로드 실패:", error);
        });
    }
  }, [user?.uid]);
  useEffect(() => {
    const handleWindowFocus = () => {
      setBrowserNotificationPermission(getNotificationPermission());
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    const syncNotificationsState = (
      event: CustomEvent<{ enabled: boolean }>
    ) => {
      if (typeof event.detail?.enabled !== "boolean") {
        return;
      }

      const enabled = event.detail.enabled;
      setNotifications(enabled);
      localStorage.setItem("notifications", JSON.stringify(enabled));
      localStorage.setItem("bookmarkNotifications", JSON.stringify(enabled));

      if (!enabled) {
        setSystemNotifications(false);
        localStorage.setItem("systemNotifications", JSON.stringify(false));
      }
    };

    const syncSystemNotificationsState = (
      event: CustomEvent<{ enabled: boolean }>
    ) => {
      if (typeof event.detail?.enabled !== "boolean") {
        return;
      }

      const enabled = event.detail.enabled;
      setSystemNotifications(enabled);
      localStorage.setItem("systemNotifications", JSON.stringify(enabled));
      setBrowserNotificationPermission(getNotificationPermission());
    };

    const notificationsListener = syncNotificationsState as EventListener;
    const systemListener = syncSystemNotificationsState as EventListener;

    window.addEventListener("notificationsChanged", notificationsListener);
    window.addEventListener(
      "bookmarkNotificationsChanged",
      notificationsListener
    );
    window.addEventListener("systemNotificationsChanged", systemListener);

    return () => {
      window.removeEventListener("notificationsChanged", notificationsListener);
      window.removeEventListener(
        "bookmarkNotificationsChanged",
        notificationsListener
      );
      window.removeEventListener("systemNotificationsChanged", systemListener);
    };
  }, []);

  useEffect(() => {
    if (browserNotificationPermission.denied && systemNotifications) {
      setSystemNotifications(false);
      localStorage.setItem("systemNotifications", JSON.stringify(false));

      if (user?.uid) {
        setUserNotificationSettings(user.uid, {
          systemNotifications: false,
        });
      }

      window.dispatchEvent(
        new CustomEvent("systemNotificationsChanged", {
          detail: { enabled: false },
        })
      );

      toast.error(t("notifications.permissionDenied"));
    }
  }, [browserNotificationPermission.denied, systemNotifications, user?.uid, t]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() =>
    loadBackupSettings()
  );
  const [backupStatus, setBackupStatus] = useState(() => getBackupStatus());
  const [defaultPage, setDefaultPage] = useState(
    () => localStorage.getItem("defaultPage") || "dashboard"
  );
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<ImportPreviewData | null>(null);
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
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem("notifications", JSON.stringify(newValue));
    localStorage.setItem("bookmarkNotifications", JSON.stringify(newValue));

    const updates: {
      notifications: boolean;
      bookmarkNotifications: boolean;
      systemNotifications?: boolean;
    } = {
      notifications: newValue,
      bookmarkNotifications: newValue,
    };

    if (!newValue) {
      setSystemNotifications(false);
      localStorage.setItem("systemNotifications", JSON.stringify(false));
      updates.systemNotifications = false;
    }

    if (user?.uid) {
      await setUserNotificationSettings(user.uid, updates);
    }

    toast.success(
      `북마크 알림이 ${newValue ? "활성화" : "비활성화"}되었습니다.`
    );

    window.dispatchEvent(
      new CustomEvent("notificationsChanged", {
        detail: { enabled: newValue },
      })
    );
    window.dispatchEvent(
      new CustomEvent("bookmarkNotificationsChanged", {
        detail: { enabled: newValue },
      })
    );
  };

  const handleSystemNotificationToggle = async () => {
    if (!notifications) {
      toast.error("북마크 알림을 먼저 활성화해주세요.");
      return;
    }

    const newValue = !systemNotifications;

    if (!systemNotifications) {
      const hasPermission = await requestNotificationPermission();
      const permission = getNotificationPermission();
      setBrowserNotificationPermission(permission);

      if (!hasPermission || permission.granted === false) {
        toast.error(
          "시스템 알림 권한이 필요합니다. 브라우저 설정에서 권한을 허용해주세요."
        );
        return;
      }
    }

    setSystemNotifications(newValue);
    localStorage.setItem("systemNotifications", JSON.stringify(newValue));

    if (user?.uid) {
      await setUserNotificationSettings(user.uid, {
        systemNotifications: newValue,
      });
    }

    if (!newValue) {
      window.dispatchEvent(
        new CustomEvent("systemNotificationsChanged", {
          detail: { enabled: false },
        })
      );
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

  // 데이터 내보내기 핸들러 (JSON 형식)
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

  // Chrome 북마크 형식으로 내보내기 핸들러
  const handleExportChromeBookmarks = () => {
    try {
      if (!rawBookmarks || rawBookmarks.length === 0) {
        toast.error("내보낼 북마크가 없습니다.");
        return;
      }

      downloadChromeBookmarks(rawBookmarks, collections);
      toast.success("Chrome 북마크 형식으로 내보내졌습니다.");
    } catch (error) {
      console.error("Chrome bookmark export error:", error);
      toast.error("Chrome 북마크 내보내기 중 오류가 발생했습니다.");
    }
  };

  // 데이터 가져오기 핸들러 (JSON 형식)
  const handleImportData = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Chrome 북마크 형식 가져오기 핸들러
  const handleImportChromeBookmarks = () => {
    if (chromeBookmarkFileInputRef.current) {
      chromeBookmarkFileInputRef.current.click();
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsedData = sanitizeImportPreviewData(JSON.parse(text));

      if (!parsedData) {
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

  // Chrome 북마크 파일 업로드 핸들러
  const handleChromeBookmarkFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      // Chrome 북마크 HTML 파싱
      const parsed = parseChromeBookmarks(text);

      if (parsed.bookmarks.length === 0) {
        toast.error("북마크를 찾을 수 없습니다.");
        return;
      }

      if (!user?.uid) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      // 앱 형식으로 변환
      const converted = convertChromeBookmarksToAppFormat(parsed, user.uid);

      // ImportPreviewData 형식으로 변환
      const importData: ImportPreviewData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        bookmarks: converted.bookmarks as Array<Record<string, unknown>>,
        collections: converted.collections as Array<Record<string, unknown>>,
      };

      setImportData(importData);
      setShowImportModal(true);
    } catch (error) {
      console.error("Chrome bookmark import error:", error);
      toast.error("Chrome 북마크 파일 읽기 중 오류가 발생했습니다.");
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

  const handleConfirmDeleteAccount = async () => {
    try {
      toast.success("계정이 삭제되었습니다.");
      setShowDeleteAccountModal(false);
      await Promise.resolve(logout());
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Account deletion or logout failed:", error);
      toast.error(t("common.error"));
    }
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
    chromeBookmarkFileInputRef,

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
    handleExportChromeBookmarks,
    handleImportData,
    handleImportChromeBookmarks,
    handleFileUpload,
    handleChromeBookmarkFileUpload,
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
