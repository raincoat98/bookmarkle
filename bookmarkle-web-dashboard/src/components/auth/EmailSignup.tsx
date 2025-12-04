import { useState } from "react";
import { signupWithEmail } from "../../firebase";

interface EmailSignupProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function EmailSignup({
  onSuccess,
  onSwitchToLogin,
}: EmailSignupProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateForm = (): string | null => {
    if (!email.trim()) return "이메일을 입력해주세요.";
    if (!password.trim()) return "비밀번호를 입력해주세요.";
    if (password.length < 6) return "비밀번호는 최소 6자 이상이어야 합니다.";
    if (password !== confirmPassword) return "비밀번호가 일치하지 않습니다.";
    if (!displayName.trim()) return "이름을 입력해주세요.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signupWithEmail(email, password, displayName);
      onSuccess?.();
    } catch (err: unknown) {
      console.error("회원가입 실패:", err);
      const error = err as { code?: string };
      setError(getErrorMessage(error.code || ""));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case "auth/email-already-in-use":
        return "이미 사용 중인 이메일입니다.";
      case "auth/invalid-email":
        return "유효하지 않은 이메일 형식입니다.";
      case "auth/operation-not-allowed":
        return "이메일/비밀번호 회원가입이 비활성화되어 있습니다.";
      case "auth/weak-password":
        return "비밀번호가 너무 약합니다. 더 강한 비밀번호를 사용하세요.";
      default:
        return "회원가입 중 오류가 발생했습니다.";
    }
  };

  const getPasswordStrength = (
    password: string
  ): { strength: string; color: string } => {
    if (password.length === 0) return { strength: "", color: "" };
    if (password.length < 6) return { strength: "약함", color: "#f44336" };
    if (password.length < 8) return { strength: "보통", color: "#ff9800" };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: "보통", color: "#ff9800" };
    }
    return { strength: "강함", color: "#4caf50" };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-center mb-6 font-semibold text-gray-900 dark:text-white">회원가입</h3>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-3 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label
          htmlFor="displayName"
          className="block mb-2 font-medium text-sm text-gray-900 dark:text-white"
        >
          이름
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="홍길동"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="email"
          className="block mb-2 font-medium text-sm text-gray-900 dark:text-white"
        >
          이메일
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="example@email.com"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="password"
          className="block mb-2 font-medium text-sm text-gray-900 dark:text-white"
        >
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="최소 6자 이상"
        />
        {password && (
          <div
            className={`text-xs mt-1 font-medium ${
              passwordStrength.strength === "강함"
                ? "text-green-600 dark:text-green-400"
                : passwordStrength.strength === "보통"
                ? "text-orange-600 dark:text-orange-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            비밀번호 강도: {passwordStrength.strength}
          </div>
        )}
      </div>

      <div className="mb-4">
        <label
          htmlFor="confirmPassword"
          className="block mb-2 font-medium text-sm text-gray-900 dark:text-white"
        >
          비밀번호 확인
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading}
          className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${
            confirmPassword && password !== confirmPassword
              ? "border-red-500 dark:border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="비밀번호를 다시 입력하세요"
        />
        {confirmPassword && password !== confirmPassword && (
          <div className="text-xs mt-1 text-red-600 dark:text-red-400">
            비밀번호가 일치하지 않습니다
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={
          loading || !email.trim() || !password.trim() || !displayName.trim()
        }
        className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-medium py-2 rounded mb-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 transition-colors"
      >
        {loading ? "회원가입 중..." : "회원가입"}
      </button>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        이미 계정이 있으신가요?{" "}
        {onSwitchToLogin && (
          <button
            type="button"
            onClick={onSwitchToLogin}
            disabled={loading}
            className="text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            로그인
          </button>
        )}
      </div>
    </form>
  );
}
