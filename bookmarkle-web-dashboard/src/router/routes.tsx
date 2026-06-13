import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LoginScreen } from "../components/auth/LoginScreen";
import { AdminProtected } from "../components/admin/AdminProtected";
import { SubscriptionBanner } from "../components/subscription/SubscriptionBanner";
import { SubscriptionAnnouncementModal } from "../components/subscription/SubscriptionAnnouncementModal";
import { isBetaPeriod } from "../utils/betaFlags";
import { getUserDefaultPage, auth } from "../firebase";
import { useAuthStore } from "../stores";

const DashboardPage = lazy(() =>
  import("../pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const BookmarksPage = lazy(() =>
  import("../pages/BookmarksPage").then((m) => ({ default: m.BookmarksPage }))
);
const SettingsPage = lazy(() =>
  import("../pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const AdminPage = lazy(() =>
  import("../pages/AdminPage").then((m) => ({ default: m.AdminPage }))
);
const NotificationCenterPage = lazy(() =>
  import("../pages/NotificationCenterPage").then((m) => ({
    default: m.NotificationCenterPage,
  }))
);
const PricingPage = lazy(() =>
  import("../pages/PricingPage").then((m) => ({ default: m.PricingPage }))
);
const SubscriptionPage = lazy(() =>
  import("../pages/SubscriptionPage").then((m) => ({
    default: m.SubscriptionPage,
  }))
);
const EarlyBirdPolicyPage = lazy(() =>
  import("../pages/EarlyBirdPolicyPage").then((m) => ({
    default: m.EarlyBirdPolicyPage,
  }))
);
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

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

export function AppRoutes() {
  const { user, loading, hasCachedSession } = useAuthStore();
  const location = useLocation();
  const [defaultPage, setDefaultPage] = useState<string | null>(null);
  const isPrefetchingSession = loading && hasCachedSession;
  const shouldUseProtectedRoutes = !!user || isPrefetchingSession;

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
  if (!user && !isPrefetchingSession && location.pathname === "/") {
    return <LoginScreen />;
  }

  return (
    <LayoutWrapper>
      <Suspense fallback={null}>
        <Routes>
          {/* 공개 라우트 - 모든 사용자 접근 가능 */}
          <Route path="/about" element={<LandingPage />} />

          {/* SignIn Popup 라우트 (Extension에서 사용) */}
          <Route path="/signin-popup" element={<LoginScreen />} />

          {/* 로그인 필요 라우트 */}
          {!shouldUseProtectedRoutes ? (
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
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/notifications"
                element={<NotificationCenterPage />}
              />
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
              <Route
                path="/login"
                element={
                  <Navigate
                    to={
                      defaultPage === "bookmarks" ? "/bookmarks" : "/dashboard"
                    }
                    replace
                  />
                }
              />
            </>
          )}

          {/* 모든 정의되지 않은 라우트는 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </LayoutWrapper>
  );
}
