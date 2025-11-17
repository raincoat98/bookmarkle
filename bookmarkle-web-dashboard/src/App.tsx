import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AdminPage } from "./pages/AdminPage";
import { ExtensionLoginSuccessPage } from "./pages/ExtensionLoginSuccessPage";
import { NotificationCenterPage } from "./pages/NotificationCenterPage";
import { PricingPage } from "./pages/PricingPage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { EarlyBirdPolicyPage } from "./pages/EarlyBirdPolicyPage";
import { LoginScreen } from "./components/LoginScreen";
import { AdminProtected } from "./components/AdminProtected";
import ExtensionBridge from "./components/ExtensionBridge";
import { SubscriptionBanner } from "./components/SubscriptionBanner";
import { SubscriptionAnnouncementModal } from "./components/SubscriptionAnnouncementModal";
import { betaUtils, isBetaPeriod } from "./utils/betaFlags";
import { Toaster } from "react-hot-toast";
import { useEffect, useState, useRef } from "react";
import { getUserDefaultPage } from "./firebase";
import {
  shouldBackup,
  performBackup,
  loadBackupSettings,
} from "./utils/backup";
import {
  useAuthStore,
  useBookmarkStore,
  useCollectionStore,
  useSubscriptionStore,
  initializeTheme,
} from "./stores";

function AppContent() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // 관리자 페이지인지 확인
  const isAdminPage = location.pathname === "/admin";

  // 구독 알림 모달 표시 (로그인된 사용자에게, 관리자 페이지 제외)
  useEffect(() => {
    if (user && !isAdminPage && betaUtils.shouldShowModal()) {
      setShowSubscriptionModal(true);
    }
  }, [user, isAdminPage]);

  // 로컬 스토리지 변경 감지 (구독 설정 초기화 시 모달 다시 표시)
  useEffect(() => {
    const checkSubscriptionModal = () => {
      if (user && !isAdminPage && betaUtils.shouldShowModal()) {
        setShowSubscriptionModal(true);
      }
    };

    checkSubscriptionModal();
    const interval = setInterval(checkSubscriptionModal, 500);

    return () => {
      clearInterval(interval);
    };
  }, [user, isAdminPage]);

  return (
    <>
      {/* 관리자 페이지가 아닐 때만 배너 표시 */}
      {user && !isAdminPage && <SubscriptionBanner />}
      {user && !isAdminPage && (
        <SubscriptionAnnouncementModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />
      )}
      {!user ? (
        <LoginScreen />
      ) : (
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationCenterPage />} />
          <Route
            path="/pricing"
            element={
              isBetaPeriod() ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <PricingPage />
              )
            }
          />
          <Route
            path="/subscription"
            element={
              isBetaPeriod() ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <SubscriptionPage />
              )
            }
          />
          <Route path="/early-bird-policy" element={<EarlyBirdPolicyPage />} />
          <Route
            path="/admin"
            element={
              <AdminProtected>
                <AdminPage />
              </AdminProtected>
            }
          />
          <Route
            path="/extension-login-success"
            element={<ExtensionLoginSuccessPage />}
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  const { user, loading, initializeAuth } = useAuthStore();
  const { rawBookmarks } = useBookmarkStore();
  const { collections } = useCollectionStore();
  const { subscribeToSubscription } = useSubscriptionStore();
  const [defaultPage, setDefaultPage] = useState<string | null>(null);
  const backupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 인증 및 테마 초기화
  useEffect(() => {
    const unsubscribeAuth = initializeAuth();
    const unsubscribeTheme = initializeTheme();

    return () => {
      unsubscribeAuth();
      unsubscribeTheme();
    };
  }, [initializeAuth]);

  // 구독 정보 초기화
  useEffect(() => {
    if (user?.uid) {
      const unsubscribeSubscription = subscribeToSubscription(user.uid);
      return () => {
        unsubscribeSubscription();
      };
    }
  }, [user?.uid, subscribeToSubscription]);

  useEffect(() => {
    if (user?.uid) {
      getUserDefaultPage(user.uid)
        .then((page) => setDefaultPage(page || "dashboard"))
        .catch(() => setDefaultPage("dashboard"));
    }
  }, [user?.uid]);

  // 자동 백업 체크
  useEffect(() => {
    // 자동 백업 타이머 클리어
    if (backupIntervalRef.current) {
      clearInterval(backupIntervalRef.current);
    }

    const settings = loadBackupSettings();
    if (
      user?.uid &&
      settings.enabled &&
      rawBookmarks &&
      collections &&
      rawBookmarks.length > 0 &&
      collections.length > 0
    ) {
      // 주기(ms) 계산
      let intervalMs = 1000 * 60 * 60 * 24 * 7; // 기본: weekly
      if (settings.frequency === "daily") intervalMs = 1000 * 60 * 60 * 24;
      if (settings.frequency === "monthly")
        intervalMs = 1000 * 60 * 60 * 24 * 30;

      // 즉시 1회 실행
      if (shouldBackup()) {
        performBackup(rawBookmarks, collections, user.uid);
      }

      // 주기적으로 실행
      backupIntervalRef.current = setInterval(() => {
        if (shouldBackup()) {
          performBackup(rawBookmarks, collections, user.uid);
        }
      }, intervalMs);
    }

    // 언마운트 시 타이머 해제
    return () => {
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
      }
    };
  }, [user?.uid, rawBookmarks, collections]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "defaultPage") {
        setDefaultPage(e.newValue || "dashboard");
      }
    };
    const handleLocalStorageChange = () => {
      // Firestore에서 다시 불러오도록 트리거
      if (user?.uid) {
        getUserDefaultPage(user.uid)
          .then((page) => setDefaultPage(page || "dashboard"))
          .catch(() => setDefaultPage("dashboard"));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleLocalStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "localStorageChange",
        handleLocalStorageChange
      );
    };
  }, [user?.uid]);

  if (loading || (user && defaultPage === null)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ExtensionBridge />
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={defaultPage === "bookmarks" ? "/bookmarks" : "/dashboard"}
              replace
            />
          }
        />
        <Route path="*" element={<AppContent />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
        }}
      />
    </Router>
  );
}

export default App;
