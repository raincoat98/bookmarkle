import type { User } from "firebase/auth";
import { auth, firebaseConfig } from "./core";

type StsTokenUser = User & {
  stsTokenManager?: {
    refreshToken?: string;
  };
};

type StoredAuthUser = {
  stsTokenManager?: {
    refreshToken?: string;
  };
};

const parseStoredAuthUser = (value: string): StoredAuthUser => {
  return JSON.parse(value) as StoredAuthUser;
};

export function getRefreshToken(): string | null {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn("🔐 현재 로그인된 사용자 없음");
      return null;
    }

    const tokenManager = (user as StsTokenUser).stsTokenManager;
    if (tokenManager?.refreshToken) {
      console.log("✅ Refresh Token 추출 완료 (stsTokenManager)");
      return tokenManager.refreshToken;
    }

    const firebaseKey = `firebase:authUser:${firebaseConfig.apiKey}:[DEFAULT]`;
    const authUserData = localStorage.getItem(firebaseKey);

    if (authUserData) {
      try {
        const parsed = parseStoredAuthUser(authUserData);
        const refreshToken = parsed.stsTokenManager?.refreshToken;
        if (refreshToken) {
          console.log("✅ Refresh Token 추출 완료 (localStorage)");
          return refreshToken;
        }
      } catch (parseError) {
        console.warn("🔐 localStorage 파싱 실패:", parseError);
      }
    }

    console.warn("🔐 Refresh Token을 찾을 수 없음");
    return null;
  } catch (error) {
    console.error("🔐 Refresh Token 추출 오류:", error);
    return null;
  }
}
