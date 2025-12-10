import { create } from "zustand";
import { watchAuth } from "../firebase";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  db,
  loginWithGoogle,
  loginWithEmail as fbLoginWithEmail,
  signupWithEmail,
  logout as fbLogout,
} from "../firebase";
import { getExtensionId } from "../utils/extensionId";

declare global {
  interface WindowWithChrome extends Window {
    chrome?: {
      runtime: {
        sendMessage: (
          extensionId: string,
          message: unknown,
          callback?: (response?: unknown) => void
        ) => void;
        lastError?: { message: string };
      };
    };
  }
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isActive: boolean | null;
  isActiveLoading: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setIsActive: (isActive: boolean | null) => void;
  setIsActiveLoading: (isActiveLoading: boolean) => void;
  checkUserStatus: (uid: string) => Promise<boolean>;
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

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // State
  user: null,
  loading: true,
  isActive: null,
  isActiveLoading: false,

  // Actions
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setIsActive: (isActive) => set({ isActive }),
  setIsActiveLoading: (isActiveLoading) => set({ isActiveLoading }),

  // 사용자 활성화 상태 확인
  checkUserStatus: async (uid: string) => {
    try {
      set({ isActiveLoading: true });
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const active = userData.isActive !== false; // 기본값은 true
        set({ isActive: active });
        return active;
      }
      return true; // 문서가 없으면 기본적으로 활성화
    } catch (error) {
      console.error("사용자 상태 확인 실패:", error);
      return true; // 에러 발생 시 기본값 true
    } finally {
      set({ isActiveLoading: false });
    }
  },

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
      await fbLogout();

      // 확장에 로그아웃 알림
      const chromeRuntime = (window as WindowWithChrome).chrome?.runtime;
      const extensionId = getExtensionId();

      if (extensionId && chromeRuntime) {
        try {
          chromeRuntime.sendMessage(extensionId, {
            type: "AUTH_STATE_CHANGED",
            user: null,
          });
        } catch {
          // 확장이 없을 수 있으므로 에러 무시
        }
      }

      // Offscreen에도 전송
      window.postMessage({
        type: "AUTH_STATE_CHANGED",
        user: null,
        idToken: null,
      }, "*");
    } catch (error) {
      console.error("로그아웃 실패:", error);
      throw error;
    }
  },

  // 인증 상태 초기화 및 감시
  initializeAuth: () => {
    let authCallbackFired = false;

    // 1초 타임아웃: Firebase auth callback이 호출되지 않으면 로딩 완료
    const timeoutId = setTimeout(() => {
      if (!authCallbackFired) {
        console.log("⚠️ Auth callback timeout (1s) - setting loading to false");
        set({ loading: false });
      }
    }, 1000);

    // 인증 상태 감시
    const unsubscribe = watchAuth((user) => {
      authCallbackFired = true;
      clearTimeout(timeoutId);

      if (user) {
        console.log("✅ Auth callback fired: user logged in -", user.email);
      } else {
        console.log("✅ Auth callback fired: user logged out");
      }

      set({ user, loading: false });

      // 사용자 변경 시 상태 확인 (백그라운드에서 실행)
      if (user) {
        getDoc(doc(db, "users", user.uid))
          .then((userDoc) => {
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const active = userData.isActive !== false;
              set({ isActive: active, isActiveLoading: false });
            } else {
              set({ isActive: true, isActiveLoading: false });
            }
          })
          .catch((error) => {
            console.error("사용자 상태 확인 실패:", error);
            set({ isActive: true, isActiveLoading: false });
          });
      } else {
        set({ isActive: null, isActiveLoading: false });
      }
    });

    return unsubscribe;
  },
}));
