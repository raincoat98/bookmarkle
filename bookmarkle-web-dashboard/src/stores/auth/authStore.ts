import { create } from "zustand";
import { auth, firebaseConfig } from "../../firebase";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  db,
  loginWithGoogle,
  loginWithEmail as fbLoginWithEmail,
  signupWithEmail,
  logout as fbLogout,
} from "../../firebase";

import { onAuthStateChanged } from "firebase/auth";
import { useBookmarkStore } from "../bookmark/bookmarkStore";
import { useSubscriptionStore } from "./subscriptionStore";

const hasCachedAuthSession = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const keyPrefix = `firebase:authUser:${firebaseConfig.apiKey}:`;
    for (let index = 0; index < localStorage.length; index++) {
      if (localStorage.key(index)?.startsWith(keyPrefix)) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
};

interface AuthState {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  isActive: boolean | null;
  hasCachedSession: boolean;
}

interface AuthActions {
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // State
  user: null,
  idToken: null,
  loading: true,
  isActive: null,
  hasCachedSession: hasCachedAuthSession(),

  // Google 로그인 (firebase.ts에서 처리)
  login: async () => {
    try {
      console.log("🔄 Google 로그인 시작...");
      await loginWithGoogle();
    } catch (error) {
      console.error("로그인 실패:", error);
      throw error;
    }
  },

  // 이메일 로그인
  loginWithEmail: async (email: string, password: string) => {
    try {
      await fbLoginWithEmail(email, password);
    } catch (error) {
      console.error("이메일 로그인 실패:", error);
      throw error;
    }
  },

  // 회원가입
  signup: async (email: string, password: string, displayName: string) => {
    try {
      await signupWithEmail(email, password, displayName);
    } catch (error) {
      console.error("회원가입 실패:", error);
      throw error;
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      const currentState = get();
      if (currentState.user === null) {
        return;
      }

      useBookmarkStore.getState().cleanupAllListeners();
      useSubscriptionStore.getState().cleanupAllListeners();

      await fbLogout();
    } catch (error) {
      console.error("로그아웃 실패:", error);
      throw error;
    }
  },

  // 인증 상태 초기화 및 감시
  initializeAuth: () => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // idToken과 사용자 상태를 병렬로 가져오기
        const [idToken, userDoc] = await Promise.all([
          user.getIdToken().catch(() => null),
          getDoc(doc(db, "users", user.uid)).catch(() => null),
        ]);

        const isActive = userDoc?.exists()
          ? userDoc.data().isActive !== false
          : true;

        set({
          user,
          idToken,
          loading: false,
          isActive,
          hasCachedSession: true,
        });
      } else {
        useBookmarkStore.getState().cleanupAllListeners();
        useSubscriptionStore.getState().cleanupAllListeners();

        set({
          user: null,
          idToken: null,
          loading: false,
          isActive: null,
          hasCachedSession: false,
        });
      }
    });

    // Extension으로부터 토큰 요청 처리
    const handleExtensionTokenRequest = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === "TOKEN_REQUEST" &&
        event.origin === window.location.origin
      ) {
        console.log("🔐 Extension으로부터 토큰 요청 수신");
        const currentState = get();

        if (currentState.user && currentState.idToken) {
          // 최신 토큰 가져오기
          currentState.user.getIdToken(true).then((freshToken) => {
            console.log("🔐 Extension에 갱신된 토큰 전송");
            window.postMessage(
              {
                type: "TOKEN_RESPONSE",
                idToken: freshToken,
                user: {
                  uid: currentState.user!.uid,
                  email: currentState.user!.email,
                  displayName: currentState.user!.displayName,
                },
              },
              window.location.origin
            );
          }).catch((error) => {
            console.error("🔐 토큰 갱신 실패:", error);
            window.postMessage(
              {
                type: "TOKEN_RESPONSE",
                idToken: null,
                error: "토큰을 가져올 수 없습니다.",
              },
              window.location.origin
            );
          });
        } else {
          console.warn("🔐 사용자 정보 없음, 토큰 요청 거부");
          window.postMessage(
            {
              type: "TOKEN_RESPONSE",
              idToken: null,
              error: "로그인되지 않음",
            },
            window.location.origin
          );
        }
      }
    };

    // postMessage 리스너 추가
    window.addEventListener("message", handleExtensionTokenRequest);

    // 정리 함수 반환 (unsubscribe와 eventListener 제거)
    return () => {
      unsubscribeAuth();
      window.removeEventListener("message", handleExtensionTokenRequest);
    };
  },
}));
