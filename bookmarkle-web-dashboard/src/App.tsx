import { useEffect, useState, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { DashboardPage } from "./pages/DashboardPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AdminPage } from "./pages/AdminPage";
import { NotificationCenterPage } from "./pages/NotificationCenterPage";
import { PricingPage } from "./pages/PricingPage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { EarlyBirdPolicyPage } from "./pages/EarlyBirdPolicyPage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginScreen } from "./components/auth/LoginScreen";
import { AdminProtected } from "./components/admin/AdminProtected";
import { SubscriptionBanner } from "./components/subscription/SubscriptionBanner";
import { SubscriptionAnnouncementModal } from "./components/subscription/SubscriptionAnnouncementModal";
import { isBetaPeriod } from "./utils/betaFlags";
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
import { auth } from "./firebase";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const ONE_WEEK_MS = ONE_DAY_MS * 7;
const ONE_MONTH_MS = ONE_DAY_MS * 30;

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const location = useLocation();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const isAdminPage = location.pathname === "/admin";
  const showSubscriptionUI = user && !isAdminPage;

  return (
    <>
      {showSubscriptionUI && (
        <>
          <SubscriptionBanner
            onViewClick={() => setShowSubscriptionModal(true)}
          />
          <SubscriptionAnnouncementModal
            isOpen={showSubscriptionModal}
            onClose={() => setShowSubscriptionModal(false)}
            forceShow={true}
          />
        </>
      )}
      {children}
    </>
  );
}

function AppRoutes() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [defaultPage, setDefaultPage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || auth.currentUser?.uid !== user.uid) return;
    getUserDefaultPage(user.uid)
      .then((page) => setDefaultPage(page || "dashboard"))
      .catch(() => setDefaultPage("dashboard"));
  }, [user?.uid]);

  // 로그인한 사용자가 홈으로 접근할 때 기본 페이지로 리다이렉트
  if (user && location.pathname === "/") {
    return (
      <Navigate
        to={defaultPage === "bookmarks" ? "/bookmarks" : "/dashboard"}
        replace
      />
    );
  }

  // 로그인 안 한 사용자가 홈으로 접근할 때 로그인 화면으로
  if (!user && location.pathname === "/") {
    return <LoginScreen />;
  }

  return (
    <LayoutWrapper>
      <Routes>
        {/* 공개 라우트 - 모든 사용자 접근 가능 */}
        <Route path="/about" element={<LandingPage />} />

        {/* SignIn Popup 라우트 (Extension에서 사용) */}
        <Route path="/signin-popup" element={<LoginScreen />} />

        {/* 로그인 필요 라우트 */}
        {!user ? (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/settings" element={<LoginScreen />} />
            <Route path="/dashboard" element={<LoginScreen />} />
            <Route path="/bookmarks" element={<LoginScreen />} />
            <Route path="/notifications" element={<LoginScreen />} />
            <Route path="/pricing" element={<LoginScreen />} />
            <Route path="/subscription" element={<LoginScreen />} />
            <Route path="/early-bird-policy" element={<LoginScreen />} />
            <Route path="/admin" element={<LoginScreen />} />
          </>
        ) : (
          <>
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
            <Route
              path="/early-bird-policy"
              element={<EarlyBirdPolicyPage />}
            />
            <Route
              path="/admin"
              element={
                <AdminProtected>
                  <AdminPage />
                </AdminProtected>
              }
            />
            <Route path="/login" element={<LoginScreen />} />
          </>
        )}

        {/* 모든 정의되지 않은 라우트는 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LayoutWrapper>
  );
}

function App() {
  const { user, loading, initializeAuth, logout } = useAuthStore();
  const { rawBookmarks, cleanupOldTrash } = useBookmarkStore();
  const { collections } = useCollectionStore();
  const { subscribeToSubscription } = useSubscriptionStore();
  const backupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trashCleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const authInitialized = useRef(false); // Auth 초기화 중복 방지

  useEffect(() => {
    if (authInitialized.current) return; // 이미 초기화되었으면 스킵

    authInitialized.current = true;
    const unsubscribeAuth = initializeAuth();
    const unsubscribeTheme = initializeTheme();

    return () => {
      unsubscribeAuth();
      unsubscribeTheme();
      authInitialized.current = false; // cleanup 시 리셋
    };
  }, [initializeAuth]); // ESLint 경고 해결

  // Extension 로그아웃 메시지 수신 처리
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 보안: 동일 출처에서만 수신
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "EXTENSION_LOGOUT") {
        console.log("🔓 Extension으로부터 로그아웃 메시지 수신");
        logout().catch((error) => {
          console.error("Extension 로그아웃 처리 중 오류:", error);
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [logout]);

  useEffect(() => {
    // user가 null이면 리스너 정리는 authStore의 onAuthStateChanged에서 처리됨
    if (!user?.uid) {
      return;
    }

    // 실제 Firebase Auth 상태 확인 (authStore의 user만으로는 부족)
    // Firebase Auth가 null이지만 authStore의 user가 유지되는 경우 리스너를 재설정하지 않음
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== user.uid) {
      return;
    }

    // Start subscription in parallel with other initialization
    const unsubscribeSubscription = subscribeToSubscription(user.uid);
    return () => unsubscribeSubscription();
  }, [user?.uid, subscribeToSubscription]);

  useEffect(() => {
    if (backupIntervalRef.current) {
      clearInterval(backupIntervalRef.current);
    }

    const settings = loadBackupSettings();
    const shouldSetupBackup =
      user?.uid &&
      settings.enabled &&
      rawBookmarks?.length > 0 &&
      collections?.length > 0;

    if (!shouldSetupBackup) {
      return;
    }

    const intervalMap: Record<string, number> = {
      daily: ONE_DAY_MS,
      weekly: ONE_WEEK_MS,
      monthly: ONE_MONTH_MS,
    };
    const intervalMs = intervalMap[settings.frequency] || ONE_WEEK_MS;

    if (shouldBackup()) {
      performBackup(rawBookmarks, collections, user.uid);
    }

    backupIntervalRef.current = setInterval(() => {
      if (shouldBackup()) {
        performBackup(rawBookmarks, collections, user.uid);
      }
    }, intervalMs);

    return () => {
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
      }
    };
  }, [user?.uid, rawBookmarks, collections]);

  useEffect(() => {
    if (trashCleanupIntervalRef.current) {
      clearInterval(trashCleanupIntervalRef.current);
    }

    if (!user?.uid) return;

    const handleCleanupError = (error: unknown) => {
      const err = error as { code?: string; message?: string };
      if (
        err?.code === "failed-precondition" &&
        err?.message?.includes("index is currently building")
      ) {
        console.log(
          "휴지통 자동 정리: 인덱스 빌드 중입니다. 나중에 다시 시도됩니다."
        );
      } else {
        console.error("휴지통 자동 정리 오류:", error);
      }
    };

    cleanupOldTrash(user.uid).catch(handleCleanupError);

    trashCleanupIntervalRef.current = setInterval(() => {
      cleanupOldTrash(user.uid).catch(handleCleanupError);
    }, ONE_DAY_MS);

    return () => {
      if (trashCleanupIntervalRef.current) {
        clearInterval(trashCleanupIntervalRef.current);
      }
    };
  }, [user?.uid, cleanupOldTrash]);

  if (loading) {
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
      <AppRoutes />
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
