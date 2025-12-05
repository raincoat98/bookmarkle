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
      console.log("🔐 Google login button clicked");

      // 로그인 전 sessionStorage 정리 (로그아웃 후 재로그인 시 신호 재전송 가능)
      if (typeof sessionStorage !== "undefined") {
        const keys = Object.keys(sessionStorage);
        const clearedKeys = keys.filter((key) =>
          key.startsWith("extension_auth_sent")
        );

        if (clearedKeys.length > 0) {
          console.log(`🧹 Clearing ${clearedKeys.length} sessionStorage keys:`, clearedKeys);
          clearedKeys.forEach((key) => {
            sessionStorage.removeItem(key);
            console.log(`  ✅ Cleared: ${key}`);
          });
        } else {
          console.log("📌 No sessionStorage keys to clear");
        }
      }

      console.log("🔄 Calling login()...");
      await login();
      console.log("✅ Login completed successfully");
      onAuthSuccess?.();
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === "auth/popup-closed-by-user") {
        console.log("ℹ️ User cancelled login popup");
        toast.error("로그인이 취소되었습니다.");
      } else {
        console.error("❌ Google login error:", error);
        toast.error("Google 로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLoginSuccess = () => {
    onAuthSuccess?.();
  };

  const handleEmailSignupSuccess = () => {
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
