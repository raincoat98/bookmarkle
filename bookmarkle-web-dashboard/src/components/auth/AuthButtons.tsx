// src/components/AuthButtons.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle, logout } from "../../firebase";
import { useAuthStore } from "../../stores";
import EmailLogin from "./EmailLogin";
import EmailSignup from "./EmailSignup";

type AuthMode = "buttons" | "email-login" | "email-signup";

export default function AuthButtons() {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();
  const [authMode, setAuthMode] = useState<AuthMode>("buttons");

  if (loading) return <p>로딩중...</p>;

  if (!user) {
    // 이메일 로그인 모드
    if (authMode === "email-login") {
      return (
        <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
          <EmailLogin
            onSuccess={() => setAuthMode("buttons")}
            onSwitchToSignup={() => setAuthMode("email-signup")}
          />
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              onClick={() => setAuthMode("buttons")}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ← 다른 로그인 방법
            </button>
          </div>
        </div>
      );
    }

    // 회원가입 모드
    if (authMode === "email-signup") {
      return (
        <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
          <EmailSignup
            onSuccess={() => setAuthMode("buttons")}
            onSwitchToLogin={() => setAuthMode("email-login")}
          />
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              onClick={() => setAuthMode("buttons")}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ← 다른 로그인 방법
            </button>
          </div>
        </div>
      );
    }

    // 기본 로그인 버튼들
    return (
      <div style={{ textAlign: "center", maxWidth: "400px", margin: "0 auto" }}>
        <h3 style={{ marginBottom: "24px" }}>🔐 로그인</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={() => loginWithGoogle().catch((e: Error) => alert(e.message))}
            style={{
              padding: "12px 16px",
              backgroundColor: "#4285f4",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            🔍 Google로 로그인
          </button>

          <button
            onClick={() => setAuthMode("email-login")}
            style={{
              padding: "12px 16px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            📧 이메일로 로그인
          </button>

          <button
            onClick={() => setAuthMode("email-signup")}
            style={{
              padding: "12px 16px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            ✨ 회원가입
          </button>
        </div>
      </div>
    );
  }

  // 로그인된 사용자 UI
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt="avatar"
          style={{ width: 32, height: 32, borderRadius: "50%" }}
        />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "#1976d2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          {user.displayName?.charAt(0) || user.email?.charAt(0) || "?"}
        </div>
      )}
      <span>{user.displayName ?? user.email}</span>
      <button
        onClick={() => logout().then(() => navigate("/", { replace: true })).catch((e: Error) => alert(e.message))}
        style={{
          padding: "6px 12px",
          backgroundColor: "#f44336",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        로그아웃
      </button>
    </div>
  );
}
