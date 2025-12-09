import { useState } from "react";
import { useTranslation } from "react-i18next";
import { loginWithEmail, resetPassword } from "../../firebase";

interface EmailLoginProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export default function EmailLogin({
  onSuccess,
  onSwitchToSignup,
}: EmailLoginProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginWithEmail(email, password);
      onSuccess?.();
    } catch (err: unknown) {
      console.error("로그인 실패:", err);
      const error = err as { code?: string };
      setError(getErrorMessage(error.code || "", t));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError(t("auth.enterEmailForReset"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: unknown) {
      console.error("비밀번호 재설정 실패:", err);
      const error = err as { code?: string };
      setError(getErrorMessage(error.code || "", t));
    } finally {
      setLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="text-center py-5">
        <h3 className="font-semibold mb-3">📧 {t("auth.resetPasswordSent")}</h3>
        <p className="mb-2">
          <strong>{email}</strong>{t("auth.resetPasswordDesc")}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t("auth.resetPasswordInstr")}
        </p>
        <button
          onClick={() => setResetSent(false)}
          className="btn-primary mt-4"
        >
          {t("auth.backToLogin")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-center mb-6 font-semibold text-gray-900 dark:text-white">
        {t("auth.emailLogin")}
      </h3>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-3 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label
          htmlFor="email"
          className="block mb-2 font-medium text-sm text-gray-900 dark:text-white"
        >
          {t("auth.email")}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={t("auth.emailPlaceholder")}
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="password"
          className="block mb-2 font-medium text-sm text-gray-900 dark:text-white"
        >
          {t("auth.password")}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={t("auth.passwordPlaceholder")}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !email.trim() || !password.trim()}
        className="btn-primary w-full mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t("auth.loggingIn") : t("auth.login")}
      </button>

      <div className="space-y-2 mb-6 flex justify-between">
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={loading}
          className="w-full text-center text-gray-300 hover:text-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("auth.findPassword")}
        </button>

        {onSwitchToSignup && (
          <button
            type="button"
            onClick={onSwitchToSignup}
            disabled={loading}
            className="w-full text-center text-gray-300 hover:text-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("auth.signUp")}
          </button>
        )}
      </div>
    </form>
  );
}

// Helper function
function getErrorMessage(code: string, t: (key: string) => string): string {
  switch (code) {
    case "auth/user-not-found":
      return t("auth.errorUserNotFound");
    case "auth/wrong-password":
      return t("auth.errorWrongPassword");
    case "auth/invalid-email":
      return t("auth.errorInvalidEmail");
    case "auth/user-disabled":
      return t("auth.errorUserDisabled");
    case "auth/too-many-requests":
      return t("auth.errorTooManyRequests");
    default:
      return t("auth.loginError");
  }
}
