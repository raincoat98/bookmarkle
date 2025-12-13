import { useState, useEffect, useMemo } from "react";
import type { User } from "firebase/auth";
import { useAuthStore } from "../../stores";
import { useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FirebaseError } from "firebase/app";
import { BrowserCompatibilityWarning } from "../common/BrowserCompatibilityWarning";
import {
  detectBrowser,
  getBrowserCompatibilityMessage,
} from "../../utils/browserDetection";

const getRefreshToken = (user: User | null) => {
  if (!user) return null;
  const sts = (user as { stsTokenManager?: { refreshToken?: string } }).stsTokenManager;
  if (sts?.refreshToken) return sts.refreshToken;
  return (user as { refreshToken?: string }).refreshToken ?? null;
};

export const LoginScreen = () => {
  const { login, loginWithEmail, signup, user } = useAuthStore();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Debug: log user state changes
  useEffect(() => {
    console.log("👤 User state changed:", user);
  }, [user]);

  // Check if accessed from extension
  const extensionContext = useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    return {
      isExtension: urlParams.get("extension") === "true",
      extensionId: urlParams.get("extensionId"),
    };
  }, [location.search]);

  // Show success message if logged in via extension
  const [extensionLoginSuccess, setExtensionLoginSuccess] = useState(false);

  // 로그인/유저 변경 시마다 확장에 인증 정보 전송 (중복 방지 없이 항상 전송)
  useEffect(() => {
    if (extensionContext.isExtension && user && !extensionLoginSuccess) {
      (async () => {
        try {
          const idToken = await user.getIdToken();
          const refreshToken = getRefreshToken(user);
          const userData = {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
          };

          // Offscreen/content script에 전송 (bookmarkhub envelope 통일)
          window.postMessage(
            {
              source: "bookmarkhub",
              type: "AUTH_STATE_CHANGED",
              payload: {
                user: userData,
                idToken,
                refreshToken,
              },
            },
            window.location.origin
          );

          setExtensionLoginSuccess(true);
        } catch (error) {
          console.error("Failed to send auth to extension:", error);
          toast.error("익스텐션에 로그인 정보 전송 실패");
        }
      })();
    }
  }, [user, extensionContext.isExtension, extensionContext.extensionId, extensionLoginSuccess]);

  // 인증 성공 시 토스트 한 번만 표시
  useEffect(() => {
    if (extensionLoginSuccess) {
      toast.success("✅ 익스텐션에 로그인 정보 전송 완료!");
    }
  }, [extensionLoginSuccess]);

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

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await login();
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      const browserInfo = detectBrowser();
      if (firebaseError.code === "auth/popup-closed-by-user") {
        if (browserInfo.isInAppBrowser) {
          toast.error(
            "팝업이 닫혔습니다. " + getBrowserCompatibilityMessage(browserInfo)
          );
        } else {
          toast.error("로그인이 취소되었습니다.");
        }
      } else if (firebaseError.code === "auth/popup-blocked") {
        if (browserInfo.isInAppBrowser) {
          toast.error(
            "팝업이 차단되었습니다. " +
              getBrowserCompatibilityMessage(browserInfo)
          );
        } else {
          toast.error("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
        }
      } else if (firebaseError.code === "auth/cancelled-popup-request") {
        toast.error("로그인 요청이 취소되었습니다.");
      } else if (firebaseError.code === "auth/network-request-failed") {
        if (browserInfo.isInAppBrowser) {
          toast.error(
            "네트워크 오류가 발생했습니다. " +
              getBrowserCompatibilityMessage(browserInfo)
          );
        } else {
          toast.error(
            "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요."
          );
        }
      } else {
        console.error("Google login error:", error);
        if (browserInfo.isInAppBrowser) {
          toast.error(
            "Google 로그인에 실패했습니다. " +
              getBrowserCompatibilityMessage(browserInfo)
          );
        } else {
          toast.error("Google 로그인에 실패했습니다. 다시 시도해주세요.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

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
        if (firebaseError.code === "auth/email-already-in-use") {
          toast.error("이미 가입된 이메일입니다. 로그인해주세요.");
          // 로그인 모드로 전환
          setIsSignup(false);
          // 비밀번호만 초기화
          setFormData((prev) => ({
            ...prev,
            password: "",
            confirmPassword: "",
          }));
        } else if (firebaseError.code === "auth/weak-password") {
          toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
        } else if (firebaseError.code === "auth/invalid-email") {
          toast.error("올바른 이메일 형식이 아닙니다.");
        } else if (firebaseError.code === "auth/operation-not-allowed") {
          toast.error("이메일/비밀번호 가입이 비활성화되어 있습니다.");
        } else {
          console.error("Signup error:", error);
          toast.error("가입 중 오류가 발생했습니다. 다시 시도해주세요.");
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
        if (firebaseError.code === "auth/user-not-found") {
          toast.error("등록되지 않은 이메일입니다. 가입해주세요.");
          // 가입 모드로 전환
          setIsSignup(true);
        } else if (firebaseError.code === "auth/wrong-password") {
          toast.error("비밀번호가 올바르지 않습니다.");
          // 비밀번호만 초기화
          setFormData((prev) => ({
            ...prev,
            password: "",
          }));
        } else if (firebaseError.code === "auth/invalid-email") {
          toast.error("올바른 이메일 형식이 아닙니다.");
        } else if (firebaseError.code === "auth/too-many-requests") {
          toast.error(
            "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."
          );
        } else if (firebaseError.code === "auth/user-disabled") {
          toast.error("비활성화된 계정입니다.");
        } else {
          console.error("Login error:", error);
          toast.error("로그인에 실패했습니다. 다시 시도해주세요.");
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

  // Extension login success view
  if (extensionContext.isExtension && extensionLoginSuccess && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-brand-100 to-accent-100 dark:from-gray-900 dark:via-brand-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="card p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                로그인 성공!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {user.email}
              </p>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-6">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  익스텐션에 로그인 정보가 전송되었습니다
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="w-full btn btn-primary"
              >
                대시보드로 이동
              </button>
              <button
                onClick={() => window.close()}
                className="w-full btn btn-secondary"
              >
                창 닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-brand-100 to-accent-100 dark:from-gray-900 dark:via-brand-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* 브라우저 호환성 경고 */}
        <BrowserCompatibilityWarning />

        <div className="card p-8">
          <div className="text-center mb-6">
            {/* Extension badge */}
            {extensionContext.isExtension && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-2xl">🔌</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  익스텐션에서 연결됨
                </p>
              </div>
            )}

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {isSignup ? "가입하기" : "로그인"}
            </h2>
          </div>

          {/* 이메일/비밀번호 폼 */}
          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            {isSignup && (
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  사용자명
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  required={isSignup}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="사용자명을 입력하세요"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {isSignup && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={isSignup}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <span>{isSignup ? "가입하기" : "로그인"}</span>
              )}
            </button>
          </form>

          {/* 구분선 */}
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

          {/* Google 로그인 버튼 */}
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

          {/* 모드 전환 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isSignup ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}
              <button
                onClick={toggleMode}
                className="ml-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
              >
                {isSignup ? "로그인" : "가입하기"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
