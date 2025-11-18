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
    } catch (err: any) {
      console.error("회원가입 실패:", err);
      setError(getErrorMessage(err.code));
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
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: "400px", margin: "0 auto" }}
    >
      <h3 style={{ textAlign: "center", marginBottom: "24px" }}>✨ 회원가입</h3>

      {error && (
        <div
          style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="displayName"
          style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
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
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
            boxSizing: "border-box",
          }}
          placeholder="홍길동"
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="email"
          style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
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
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
            boxSizing: "border-box",
          }}
          placeholder="example@email.com"
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="password"
          style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
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
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
            boxSizing: "border-box",
          }}
          placeholder="최소 6자 이상"
        />
        {password && (
          <div
            style={{
              fontSize: "12px",
              marginTop: "4px",
              color: passwordStrength.color,
            }}
          >
            비밀번호 강도: {passwordStrength.strength}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="confirmPassword"
          style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
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
          style={{
            width: "100%",
            padding: "12px",
            border: `1px solid ${
              confirmPassword && password !== confirmPassword
                ? "#f44336"
                : "#ddd"
            }`,
            borderRadius: "4px",
            fontSize: "16px",
            boxSizing: "border-box",
          }}
          placeholder="비밀번호를 다시 입력하세요"
        />
        {confirmPassword && password !== confirmPassword && (
          <div style={{ fontSize: "12px", marginTop: "4px", color: "#f44336" }}>
            비밀번호가 일치하지 않습니다
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={
          loading || !email.trim() || !password.trim() || !displayName.trim()
        }
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: loading ? "#ccc" : "#4caf50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          fontWeight: "500",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "12px",
        }}
      >
        {loading ? "회원가입 중..." : "회원가입"}
      </button>

      <div style={{ textAlign: "center", fontSize: "14px" }}>
        이미 계정이 있으신가요?{" "}
        {onSwitchToLogin && (
          <button
            type="button"
            onClick={onSwitchToLogin}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              color: "#1976d2",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            로그인
          </button>
        )}
      </div>
    </form>
  );
}
