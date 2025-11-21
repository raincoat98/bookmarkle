import { useState } from "react";
import { loginWithEmail, resetPassword } from "../../firebase";

interface EmailLoginProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export default function EmailLogin({
  onSuccess,
  onSwitchToSignup,
}: EmailLoginProps) {
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
    } catch (err: any) {
      console.error("로그인 실패:", err);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("비밀번호 재설정을 위해 이메일을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      console.error("비밀번호 재설정 실패:", err);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case "auth/user-not-found":
        return "등록되지 않은 이메일입니다.";
      case "auth/wrong-password":
        return "잘못된 비밀번호입니다.";
      case "auth/invalid-email":
        return "유효하지 않은 이메일 형식입니다.";
      case "auth/user-disabled":
        return "비활성화된 계정입니다.";
      case "auth/too-many-requests":
        return "너무 많은 시도로 인해 일시적으로 차단되었습니다.";
      default:
        return "로그인 중 오류가 발생했습니다.";
    }
  };

  if (resetSent) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h3>📧 비밀번호 재설정 이메일 전송됨</h3>
        <p>
          <strong>{email}</strong>으로 비밀번호 재설정 링크를 전송했습니다.
        </p>
        <p style={{ fontSize: "14px", color: "#666" }}>
          이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정하세요.
        </p>
        <button
          onClick={() => setResetSent(false)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "16px",
          }}
        >
          로그인으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: "400px", margin: "0 auto" }}
    >
      <h3 style={{ textAlign: "center", marginBottom: "24px" }}>
        📧 이메일 로그인
      </h3>

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
          placeholder="비밀번호를 입력하세요"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !email.trim() || !password.trim()}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: loading ? "#ccc" : "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          fontWeight: "500",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "12px",
        }}
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>

      <div style={{ textAlign: "center", fontSize: "14px" }}>
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            color: "#1976d2",
            cursor: "pointer",
            textDecoration: "underline",
            marginRight: "16px",
          }}
        >
          비밀번호 찾기
        </button>

        {onSwitchToSignup && (
          <button
            type="button"
            onClick={onSwitchToSignup}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              color: "#1976d2",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            회원가입
          </button>
        )}
      </div>
    </form>
  );
}
