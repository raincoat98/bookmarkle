import { useState } from "react";
import { useAuthStore } from "../../stores";
import { FirebaseError } from "firebase/app";
import { toast } from "react-hot-toast";
import EmailLogin from "./EmailLogin";
import EmailSignup from "./EmailSignup";

interface ExtensionAuthContainerProps {
  isExtensionContext: boolean;
  onAuthSuccess?: () => void;
}

export function ExtensionAuthContainer({
  isExtensionContext,
  onAuthSuccess,
}: ExtensionAuthContainerProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      console.log("🔐 Google login initiated");
      await login();
      console.log("✅ Login completed");
      onAuthSuccess?.();
    } catch (error: unknown) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLoginSuccess = () => {
    console.log("✅ Email login successful");
    onAuthSuccess?.();
  };

  const handleEmailSignupSuccess = () => {
    console.log("✅ Email signup successful");
    onAuthSuccess?.();
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-brand-100 to-accent-100 dark:from-gray-900 dark:via-brand-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="card p-8">
          <div className="text-center mb-6">
            {/* Extension badge */}
            {isExtensionContext && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-2xl">🔌</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  Chrome Extension에서 접속됨
                </p>
              </div>
            )}
          </div>

          {/* Email Auth Forms - Reuse existing components */}
          {isSignup ? (
            <EmailSignup
              onSuccess={handleEmailSignupSuccess}
              onSwitchToLogin={toggleMode}
            />
          ) : (
            <EmailLogin
              onSuccess={handleEmailLoginSuccess}
              onSwitchToSignup={toggleMode}
            />
          )}

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                또는
              </span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Google로 {isSignup ? "가입" : "로그인"}</span>
          </button>

          {/* Footer info */}
          {isExtensionContext && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                로그인 후 Extension에 연결됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * 팝업 차단 관련 에러 여부 확인
 */
function isPopupBlockedError(error: FirebaseError): boolean {
  return (
    error.code === "auth/popup-closed-by-user" ||
    error.code === "auth/popup-blocked" ||
    error.message?.includes("Cross-Origin-Opener-Policy") ||
    error.message?.includes("blocked by browser") ||
    error.message?.includes("popup blocked") ||
    error.message?.includes("cross-origin") ||
    error.message?.includes("Pending promise was never set")
  );
}

/**
 * 로그인 에러 처리
 */
function handleLoginError(error: unknown) {
  const firebaseError = error as FirebaseError;

  // 팝업 차단 시 redirect로 폴백됨 (에러 아님)
  if (isPopupBlockedError(firebaseError)) {
    console.log("ℹ️ Popup blocked, redirect initiated");
    notifyParentFallback(firebaseError.message);
    return; // redirect는 페이지를 떠나므로 에러 표시 불필요
  }

  console.error("❌ Google login error:", error);
  notifyParentError(firebaseError);
  toast.error("Google 로그인에 실패했습니다. 다시 시도해주세요.");
}

/**
 * offscreen.js에 폴백 메시지 전송
 */
function notifyParentFallback(message?: string) {
  try {
    window.parent.postMessage(
      {
        type: "AUTH_FALLBACK",
        code: "popup-blocked-redirect-fallback",
        message: "팝업이 차단되어 다시 시도 중입니다...",
        details: message,
      },
      "*"
    );
  } catch (e) {
    console.error("Failed to send fallback message:", e);
  }
}

/**
 * offscreen.js에 에러 메시지 전송
 */
function notifyParentError(error: FirebaseError) {
  try {
    window.parent.postMessage(
      {
        type: "AUTH_ERROR",
        code: error.code || "unknown",
        message: error.message || "로그인에 실패했습니다",
        details: error.toString(),
      },
      "*"
    );
    console.log("📤 Auth error sent to parent");
  } catch (e) {
    console.error("Failed to send error to parent:", e);
  }
}
