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

  // Signal iframe readiness to offscreen document on page load
  useEffect(() => {
    if (extensionIsContext) {
      // Send IFRAME_READY signal to parent (offscreen.js) immediately on mount
      window.parent.postMessage(
        { type: "IFRAME_READY" },
        "*"
      );
      console.log("📨 IFRAME_READY signal sent to parent on page load");
    }
  }, [extensionIsContext]);

  // Cleanup: clear extension auth flags on unmount
  useEffect(() => {
    return () => {
      if (extensionIsContext && typeof sessionStorage !== "undefined") {
        const keys = Object.keys(sessionStorage);
        keys.forEach((key) => {
          if (key.startsWith("extension_auth_sent")) {
            sessionStorage.removeItem(key);
            console.log(`🧹 Cleared sessionStorage on unmount: ${key}`);
          }
        });
      }
    };
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
