import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../stores";
import { toast } from "react-hot-toast";
import { FirebaseError } from "firebase/app";
import { BrowserCompatibilityWarning } from "../common/BrowserCompatibilityWarning";
import {
  detectBrowser,
  getBrowserCompatibilityMessage,
} from "../../utils/browserDetection";
import { getRefreshToken } from "../../firebase";
import { BookOpen } from "lucide-react";

export const LoginScreen = () => {
  const { login, loginWithEmail, signup, user } = useAuthStore();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  // Extension 탭 감지
  const urlParams = new URLSearchParams(window.location.search);
  const isExtensionTab =
    urlParams.get("extension") === "true" || window.name === "extension-auth";
  const authModeParam = urlParams.get("mode") as "google" | "email" | null;

  // 폼 데이터
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Extension 탭에서 로그인 성공 후 처리
  useEffect(() => {
    if (!isExtensionTab || !user) return;

    const handleAuthSuccess = async () => {
      try {
        const idToken = await user.getIdToken();
        const refreshToken = getRefreshToken();

        const userData = {
          uid: user.uid,
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          photoURL: user.photoURL ?? "",
        };

        const authData = {
          type: "AUTH_RESULT",
          user: userData,
          idToken: idToken,
          refreshToken: refreshToken, // Refresh Token 추가
          timestamp: Date.now(),
        };

        // localStorage/sessionStorage에 저장
        try {
          localStorage.setItem(
            "extension_auth_result",
            JSON.stringify(authData)
          );
          sessionStorage.setItem(
            "extension_auth_result",
            JSON.stringify(authData)
          );
        } catch (storageError) {
          console.error("❌ localStorage 저장 실패:", storageError);
        }

        // Extension content script에 인증 결과 전송
        window.postMessage(
          {
            type: "AUTH_RESULT",
            user: userData,
            idToken: idToken,
            refreshToken: refreshToken, // Refresh Token 추가
          },
          window.location.origin
        );

        // Extension이 읽었는지 확인하고 탭 닫기
        const checkExtensionRead = setInterval(() => {
          const stillExists =
            localStorage.getItem("extension_auth_result") ||
            sessionStorage.getItem("extension_auth_result");

          if (!stillExists) {
            clearInterval(checkExtensionRead);
            setTimeout(() => window.close(), 500);
          }
        }, 1000);

        // 최대 30초 후 탭 닫기
        setTimeout(() => {
          clearInterval(checkExtensionRead);
          window.close();
        }, 30000);
      } catch (error) {
        console.error("Extension 인증 결과 처리 실패:", error);
      }
    };

    handleAuthSuccess();
  }, [isExtensionTab, user]);

  const handleError = useCallback(
    (error: unknown, defaultMessage: string) => {
      const firebaseError = error as FirebaseError;
      const browserInfo = detectBrowser();
      const isInApp = browserInfo.isInAppBrowser;
      const browserMsg = isInApp
        ? getBrowserCompatibilityMessage(browserInfo)
        : "";

      let errorMessage = defaultMessage;
      const errorCode = firebaseError.code;

      if (errorCode === "auth/popup-closed-by-user") {
        errorMessage = isInApp
          ? `팝업이 닫혔습니다. ${browserMsg}`
          : "로그인이 취소되었습니다.";
      } else if (errorCode === "auth/popup-blocked") {
        errorMessage = isInApp
          ? `팝업이 차단되었습니다. ${browserMsg}`
          : "팝업이 차단되었습니다. 팝업 차단을 해제해주세요.";
      } else if (errorCode === "auth/cancelled-popup-request") {
        errorMessage = "로그인 요청이 취소되었습니다.";
      } else if (errorCode === "auth/network-request-failed") {
        errorMessage = isInApp
          ? `네트워크 오류가 발생했습니다. ${browserMsg}`
          : "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
      } else if (errorCode) {
        errorMessage = isInApp
          ? `${defaultMessage} ${browserMsg}`
          : defaultMessage;
      }

      toast.error(errorMessage);

      // Extension 탭에서 에러 전송
      if (isExtensionTab) {
        const errorMsg = error instanceof Error ? error.message : errorMessage;
        window.postMessage(
          {
            type: "AUTH_RESULT",
            error: errorMsg,
          },
          window.location.origin
        );
      }
    },
    [isExtensionTab]
  );

  const handleGoogleLogin = useCallback(async () => {
    try {
      setLoading(true);
      await login();
    } catch (error: unknown) {
      handleError(error, "Google 로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [login, handleError]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignup) {
      // 가입 로직
      if (formData.password !== formData.confirmPassword) {
        toast.error("비밀번호가 일치하지 않습니다.");
        return;
      }

      if (formData.password.length < 6) {
        toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
        return;
      }

      try {
        setLoading(true);
        await signup(formData.email, formData.password, formData.displayName);
        toast.success("가입이 완료되었습니다!");
      } catch (error: unknown) {
        const firebaseError = error as FirebaseError;
        const errorCode = firebaseError.code;

        if (errorCode === "auth/email-already-in-use") {
          toast.error("이미 가입된 이메일입니다. 로그인해주세요.");
          setIsSignup(false);
          setFormData((prev) => ({
            ...prev,
            password: "",
            confirmPassword: "",
          }));
        } else if (errorCode === "auth/weak-password") {
          toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
        } else if (errorCode === "auth/invalid-email") {
          toast.error("올바른 이메일 형식이 아닙니다.");
        } else if (errorCode === "auth/operation-not-allowed") {
          toast.error("이메일/비밀번호 가입이 비활성화되어 있습니다.");
        } else {
          console.error("Signup error:", error);
          toast.error("가입 중 오류가 발생했습니다. 다시 시도해주세요.");
        }

        // Extension 탭에서 에러 전송
        if (isExtensionTab) {
          const errorMsg =
            firebaseError.message || "가입 중 오류가 발생했습니다.";
          window.postMessage(
            {
              type: "AUTH_RESULT",
              error: errorMsg,
            },
            window.location.origin
          );
        }
      } finally {
        setLoading(false);
      }
    } else {
      // 로그인 로직
      try {
        setLoading(true);
        await loginWithEmail(formData.email, formData.password);
      } catch (error: unknown) {
        const firebaseError = error as FirebaseError;
        const errorCode = firebaseError.code;

        if (errorCode === "auth/user-not-found") {
          toast.error("등록되지 않은 이메일입니다. 가입해주세요.");
          setIsSignup(true);
        } else if (
          errorCode === "auth/wrong-password" ||
          errorCode === "auth/invalid-credential"
        ) {
          toast.error("이메일 또는 비밀번호가 올바르지 않습니다.");
          setFormData((prev) => ({
            ...prev,
            password: "",
          }));
        } else if (errorCode === "auth/invalid-email") {
          toast.error("올바른 이메일 형식이 아닙니다.");
        } else if (errorCode === "auth/too-many-requests") {
          toast.error(
            "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."
          );
        } else if (errorCode === "auth/user-disabled") {
          toast.error("비활성화된 계정입니다.");
        } else {
          console.error("Login error:", error);
          toast.error("로그인에 실패했습니다. 다시 시도해주세요.");
        }

        // Extension 탭에서 에러 전송
        if (isExtensionTab) {
          const errorMsg = firebaseError.message || "로그인에 실패했습니다.";
          window.postMessage(
            {
              type: "AUTH_RESULT",
              error: errorMsg,
            },
            window.location.origin
          );
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    resetForm();
  };

  // Extension 탭이고 mode가 google이면 자동으로 Google 로그인 시작
  useEffect(() => {
    if (isExtensionTab && authModeParam !== "email" && !user && !loading) {
      const timer = setTimeout(() => {
        handleGoogleLogin();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isExtensionTab, authModeParam, user, loading, handleGoogleLogin]);

  // Extension 탭이 아니거나 email 모드가 아닌 경우에만 UI 표시
  const shouldShowUI = !isExtensionTab || authModeParam === "email";

  const inputCls = "w-full px-4 py-2.5 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-500 transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50/50 to-purple-50 dark:bg-[#0d0d10] dark:bg-none flex items-center justify-center px-4 relative overflow-hidden">
      {/* 다크모드 배경 글로우 */}
      <div className="hidden dark:block pointer-events-none">
        <div className="absolute w-[480px] h-[480px] rounded-full bg-violet-600/[0.07] blur-3xl -top-24 -left-24" />
        <div className="absolute w-[360px] h-[360px] rounded-full bg-indigo-600/[0.05] blur-3xl -bottom-16 -right-16" />
      </div>

      <div className="relative w-full max-w-[400px] space-y-3">
        {shouldShowUI && <BrowserCompatibilityWarning />}

        {isExtensionTab && authModeParam !== "email" && !user && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Google 로그인 중...
          </p>
        )}

        {shouldShowUI && (
          <div className="bg-white dark:bg-[#111113] border border-gray-200/80 dark:border-white/[0.06] rounded-2xl shadow-xl dark:shadow-2xl p-8">

            {/* 로고 */}
            <div className="flex flex-col items-center mb-7">
              <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-violet-500/25">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">북마클</h1>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                {isSignup ? "새 계정 만들기" : "다시 오신 것을 환영합니다"}
              </p>
            </div>

            {/* Google 로그인 — 주요 CTA */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white hover:bg-gray-50 dark:bg-white dark:hover:bg-gray-100 text-gray-700 font-medium text-sm rounded-xl border border-gray-200 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-5"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google로 {isSignup ? "계속하기" : "로그인"}
            </button>

            {/* 구분선 */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-[#111113]">
                  또는 이메일로 계속
                </span>
              </div>
            </div>

            {/* 이메일/비밀번호 폼 */}
            <form onSubmit={handleEmailAuth} className="space-y-2.5">
              {isSignup && (
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  required={isSignup}
                  placeholder="사용자명"
                  className={inputCls}
                />
              )}
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="이메일"
                className={inputCls}
              />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="비밀번호"
                className={inputCls}
              />
              {isSignup && (
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={isSignup}
                  placeholder="비밀번호 확인"
                  className={inputCls}
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-violet-500/25"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  isSignup ? "가입하기" : "로그인"
                )}
              </button>
            </form>

            {/* 모드 전환 */}
            <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
              {isSignup ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}
              <button
                onClick={toggleMode}
                className="ml-1.5 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
              >
                {isSignup ? "로그인" : "가입하기"}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
