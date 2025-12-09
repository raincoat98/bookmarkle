import { useNavigate, useLocation } from "react-router-dom";
import { useMemo, useCallback, useEffect } from "react";
import { useAuthStore } from "../stores";
import { useExtensionAuth } from "../hooks/useExtensionAuth";
import { useExtensionMessage } from "../hooks/useExtensionMessage";
import {
  isExtensionContext,
  getExtensionId,
} from "../utils/extensionMessaging";
import { ExtensionAuthContainer } from "../components/auth/ExtensionAuthContainer";
import { ExtensionLoginStatus } from "../components/auth/ExtensionLoginStatus";

export const ExtensionLoginPage = () => {
  const { user, loading, setLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive extension context from URL parameters
  const extensionIsContext = useMemo(
    () => isExtensionContext(location),
    [location]
  );
  const extensionId = useMemo(() => getExtensionId(location), [location]);

  // 무한로딩 방지: 5초 후 로딩 강제 종료
  useEffect(() => {
    if (!loading) return;

    const timeoutId = setTimeout(() => {
      console.log("⚠️ Loading timeout - forcing loading to false");
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [loading, setLoading]);

  // Signal iframe readiness to offscreen document
  useEffect(() => {
    if (!extensionIsContext) return;

    window.parent.postMessage({ type: "IFRAME_READY" }, "*");
    console.log("📨 IFRAME_READY signal sent to parent");
  }, [extensionIsContext]);

  // Handle unhandled promise rejections from Firebase
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorMessage = error?.message || String(error);

      console.error("🔥 Unhandled promise rejection:", error);

      // Firebase 내부 에러는 무시 (이미 처리됨)
      const firebaseInternalErrors = [
        "INTERNAL ASSERTION FAILED",
        "Pending promise was never set",
        "undefined is not an object",
        "Cannot read property 'closed'",
        "Cannot read properties of null"
      ];

      if (firebaseInternalErrors.some(err => errorMessage.includes(err))) {
        console.log("✅ Firebase internal error suppressed (already handled)");
        return;
      }

      // Extension 컨텍스트에서 실제 에러 발생 시 부모에 알림
      if (extensionIsContext) {
        notifyParentError(errorMessage, error);
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, [extensionIsContext]);

  // Setup extension hooks
  useExtensionAuth({
    user,
    isExtensionContext: extensionIsContext,
    extensionId,
  });

  useExtensionMessage({ user });

  // Navigation handlers
  const handleGoToDashboard = useCallback(
    () => navigate("/dashboard"),
    [navigate]
  );
  const handleCloseWindow = useCallback(() => window.close(), []);

  // Wait for auth initialization
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-brand-100 to-accent-100 dark:from-gray-900 dark:via-brand-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Render login form or status
  if (!user) {
    return (
      <ExtensionAuthContainer
        isExtensionContext={extensionIsContext}
        onAuthSuccess={() => {/* Auto-handled by useExtensionAuth */}}
      />
    );
  }

  return (
    <ExtensionLoginStatus
      user={user}
      isExtensionContext={extensionIsContext}
      onGoToDashboard={handleGoToDashboard}
      onCloseWindow={handleCloseWindow}
    />
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * 부모 window에 에러 메시지 전송
 */
function notifyParentError(errorMessage: string, error: unknown) {
  try {
    window.parent.postMessage(
      {
        type: "AUTH_ERROR",
        code: "unhandled-promise-rejection",
        message: errorMessage || "예기치 않은 에러가 발생했습니다",
        details: error?.toString?.(),
      },
      "*"
    );
  } catch (e) {
    console.error("Failed to send error to parent:", e);
  }
}
