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
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("⚠️ Loading timeout - forcing loading to false");
        setLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [loading, setLoading]);

  // Signal iframe readiness to offscreen document on EVERY mount
  useEffect(() => {
    if (extensionIsContext) {
      // Send IFRAME_READY signal to parent (offscreen.js) immediately on mount
      window.parent.postMessage(
        { type: "IFRAME_READY" },
        "*"
      );
      console.log("📨 IFRAME_READY signal sent to parent on page load");
    }
    // No dependencies - run on every mount
  }, [extensionIsContext]);

  // Handle unhandled promise rejections from Firebase
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorMessage = error?.message || String(error);

      console.error("🔥 Unhandled promise rejection:", error);

      // Firebase 내부 에러는 무시 (이미 처리됨)
      // - INTERNAL ASSERTION FAILED: Firebase 내부 assertion 에러
      // - Pending promise was never set: 팝업 차단 시 Firebase의 poll 함수 에러
      // - undefined is not an object: Safari에서의 popup 접근 실패
      if (
        errorMessage.includes("INTERNAL ASSERTION FAILED") ||
        errorMessage.includes("Pending promise was never set") ||
        errorMessage.includes("undefined is not an object") ||
        errorMessage.includes("Cannot read property 'closed'") ||
        errorMessage.includes("Cannot read properties of null")
      ) {
        console.log("✅ Firebase internal error detected and suppressed (already handled by fallback)");
        // 이 에러는 이미 signInWithRedirect로 폴백되었으므로 무시
        return;
      }

      // Extension 컨텍스트에서 실제 에러 발생 시 부모에 알림
      if (extensionIsContext && typeof window.parent?.postMessage === "function") {
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
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [extensionIsContext]);

  // Cleanup: clear extension auth flags only on actual logout (not on remount)
  useEffect(() => {
    // Don't clear on unmount - only clear when user explicitly logs out
    // This prevents issues when component remounts during navigation
  }, [extensionIsContext]);

  // Setup extension hooks
  useExtensionAuth({
    user,
    isExtensionContext: extensionIsContext,
    extensionId,
  });

  // Debug logging
  useEffect(() => {
    console.log("🔍 ExtensionLoginPage state:", {
      user: user?.email,
      userId: user?.uid,
      isLoading: loading,
      isExtensionContext: extensionIsContext,
    });
  }, [user, loading, extensionIsContext]);

  useExtensionMessage({ user });

  // Navigation handlers
  const handleGoToDashboard = useCallback(
    () => navigate("/dashboard"),
    [navigate]
  );
  const handleCloseWindow = useCallback(() => window.close(), []);

  // Wait for auth initialization to complete
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

  // Render appropriate view
  if (!user) {
    return (
      <ExtensionAuthContainer
        isExtensionContext={extensionIsContext}
        onAuthSuccess={() => {
          // Auto-send is handled by useExtensionAuth hook
        }}
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
