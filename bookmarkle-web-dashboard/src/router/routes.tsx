import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LoginScreen } from "../components/auth/LoginScreen";
import { AdminProtected } from "../components/admin/AdminProtected";
import { SubscriptionAnnouncementModal } from "../components/subscription/SubscriptionAnnouncementModal";
import { getUserDefaultPage, auth } from "../firebase";
import { useAuthStore } from "../stores";

const DashboardPage = lazy(() =>
  import("../pages/bookmark/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  }))
);
const BookmarksPage = lazy(() =>
  import("../pages/bookmark/BookmarksPage").then((m) => ({
    default: m.BookmarksPage,
  }))
);
const SettingsPage = lazy(() =>
  import("../pages/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  }))
);
const AdminPage = lazy(() =>
  import("../pages/admin/AdminPage").then((m) => ({ default: m.AdminPage }))
);
const NotificationCenterPage = lazy(() =>
  import("../pages/notification/NotificationCenterPage").then((m) => ({
    default: m.NotificationCenterPage,
  }))
);
const SubscriptionPage = lazy(() =>
  import("../pages/subscription/SubscriptionPage").then((m) => ({
    default: m.SubscriptionPage,
  }))
);
const LandingPage = lazy(() =>
  import("../pages/misc/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const NotFoundPage = lazy(() =>
  import("../pages/misc/NotFoundPage").then((m) => ({
    default: m.NotFoundPage,
  }))
);

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  // user 만 구독해서 idToken/loading 등 다른 필드 변화로 인한 재렌더 방지
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const isAdminPage = location.pathname === "/admin";
  // 배너는 사이드바와 겹치지 않게 Drawer 내부 main 영역에서 렌더링.
  // 모달은 fixed inset-0 이라 LayoutWrapper에서 렌더해도 무관.
  const showModal = !!user && !isAdminPage;

  return (
    <>
      {showModal && <SubscriptionAnnouncementModal />}
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
          {/* 공개 라우트 */}
          <Route path="/about" element={<LandingPage />} />
          <Route path="/signin-popup" element={<LoginScreen />} />

          {/* 로그인 필요 라우트 */}
          {!shouldUseProtectedRoutes ? (
            <>
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/settings" element={<LoginScreen />} />
              <Route path="/dashboard" element={<LoginScreen />} />
              <Route path="/bookmarks" element={<LoginScreen />} />
              <Route path="/notifications" element={<LoginScreen />} />
              <Route path="/subscription" element={<LoginScreen />} />
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
              <Route path="/subscription" element={<SubscriptionPage />} />
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

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </LayoutWrapper>
  );
}
