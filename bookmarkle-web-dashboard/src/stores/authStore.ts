import { create } from "zustand";
import { watchAuth, auth } from "../firebase";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  db,
  loginWithGoogle,
  loginWithEmail as fbLoginWithEmail,
  signupWithEmail,
  logout as fbLogout,
} from "../firebase";

import { onIdTokenChanged } from "firebase/auth";

interface AuthState {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  isActive: boolean | null;
  isActiveLoading: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setIdToken: (idToken: string | null) => void;
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
  idToken: null,
  loading: true,
  isActive: null,
  isActiveLoading: false,

  // Actions
  setUser: (user) => set({ user }),
  setIdToken: (idToken) => set({ idToken }),
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
        // Offscreen/content script에 전송 (bookmarkhub envelope 통일)
        window.postMessage(
          {
            source: "bookmarkhub",
            type: "AUTH_STATE_CHANGED",
            payload: {
              user: null,
              idToken: null,
              refreshToken: null,
            },
          },
          window.location.origin
        );
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

    // 인증 상태 감시 (user)
    const unsubscribeAuth = watchAuth(async (user) => {
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
        // 로그인 시 AUTH_STATE_CHANGED 메시지 전송 (bookmarkhub envelope 통일)
        const idToken = await user.getIdToken();
        const refreshToken = getRefreshToken(user);
        window.postMessage(
          {
            source: "bookmarkhub",
            type: "AUTH_STATE_CHANGED",
            payload: {
              user: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
              },
              idToken,
              refreshToken,
            },
          },
          window.location.origin
        );
      } else {
        set({ isActive: null, isActiveLoading: false });
        // 로그아웃 시 AUTH_STATE_CHANGED 메시지 전송 (bookmarkhub envelope 통일)
        window.postMessage(
          {
            source: "bookmarkhub",
            type: "AUTH_STATE_CHANGED",
            payload: {
              user: null,
              idToken: null,
              refreshToken: null,
            },
          },
          window.location.origin
        );
      }
    });

    // idToken 변경 감시
    const unsubscribeToken = onIdTokenChanged(
      auth,
      async (user) => {
        if (user) {
          const idToken = await user.getIdToken();
          set({ idToken });
        } else {
          set({ idToken: null });
        }
      }
    );

    // 언마운트 시 모두 해제
    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  },
}));
const getRefreshToken = (user: User | null) => {
  if (!user) return null;
  const sts = (user as { stsTokenManager?: { refreshToken?: string } }).stsTokenManager;
  if (sts?.refreshToken) return sts.refreshToken;
  return (user as { refreshToken?: string }).refreshToken ?? null;
};
