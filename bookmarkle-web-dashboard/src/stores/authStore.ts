import { create } from "zustand";
import { auth } from "../firebase";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  db,
  loginWithGoogle,
  loginWithEmail as fbLoginWithEmail,
  signupWithEmail,
  logout as fbLogout,
} from "../firebase";

import { onIdTokenChanged, onAuthStateChanged } from "firebase/auth";
import { notifyExtensionAuthState } from "../utils/extensionAuthMessaging";

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
      const result = await loginWithGoogle();
      const user = result?.user ?? auth.currentUser;
      if (user) {
        await notifyExtensionAuthState(user);
      }
    } catch (error) {
      console.error("로그인 실패:", error);
      throw error;
    }
  },

  // 이메일 로그인
  loginWithEmail: async (email: string, password: string) => {
    try {
      const credential = await fbLoginWithEmail(email, password);
      await notifyExtensionAuthState(credential.user);
    } catch (error) {
      console.error("이메일 로그인 실패:", error);
      throw error;
    }
  },

  // 회원가입
  signup: async (email: string, password: string, displayName: string) => {
    try {
      const credential = await signupWithEmail(email, password, displayName);
      await notifyExtensionAuthState(credential.user);
    } catch (error) {
      console.error("회원가입 실패:", error);
      throw error;
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      // 모든 Firestore 리스너 정리 (순환 참조 방지를 위해 동적 import)
      try {
        const bookmarkStore = await import("./bookmarkStore");
        bookmarkStore.useBookmarkStore.getState().cleanupAllListeners();
      } catch (error) {
        console.warn("북마크 리스너 정리 중 오류:", error);
      }

      try {
        const subscriptionStore = await import("./subscriptionStore");
        subscriptionStore.useSubscriptionStore.getState().cleanupAllListeners();
      } catch (error) {
        console.warn("구독 리스너 정리 중 오류:", error);
      }

      await fbLogout();
      await notifyExtensionAuthState(null);

      // 상태 초기화
      set({
        user: null,
        idToken: null,
        isActive: null,
      });
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

    // 인증 상태 감시 (user) - onAuthStateChanged 직접 사용
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      authCallbackFired = true;
      clearTimeout(timeoutId);

      if (user) {
        console.log("✅ Auth callback fired: user logged in -", user.email);
        set({ user, loading: false });

        // 사용자 변경 시 상태 확인 (백그라운드에서 실행)
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
        console.log("✅ Auth callback fired: user logged out");
        // Firebase Auth가 null을 반환했지만, idToken이나 user가 있으면
        // 익스텐션 새로고침 시 일시적으로 null이 될 수 있으므로 상태 유지
        const currentState = useAuthStore.getState();
        if (currentState.idToken || currentState.user) {
          console.log(
            "⚠️ Firebase Auth returned null but idToken/user exists, keeping current state"
          );

          // 익스텐션 새로고침 시 Firebase Auth가 일시적으로 null이 될 수 있으므로
          // 리스너를 정리하여 권한 오류를 방지
          // onAuthStateChanged가 다시 호출되면 자동으로 재설정됨
          console.log("🧹 임시 리스너 정리 (Firebase Auth 재동기화 대기 중)");
          try {
            const bookmarkStore = await import("./bookmarkStore");
            bookmarkStore.useBookmarkStore.getState().cleanupAllListeners();
          } catch (error) {
            console.warn("북마크 리스너 정리 중 오류:", error);
          }

          try {
            const subscriptionStore = await import("./subscriptionStore");
            subscriptionStore.useSubscriptionStore
              .getState()
              .cleanupAllListeners();
          } catch (error) {
            console.warn("구독 리스너 정리 중 오류:", error);
          }

          set({ loading: false });
          set({ isActive: null, isActiveLoading: false });
        } else {
          // idToken/user도 없으면 실제 로그아웃 상태
          console.log(
            "🔄 Firebase Auth returned null and no previous state, logging out"
          );

          // 모든 Firestore 리스너 정리
          try {
            const bookmarkStore = await import("./bookmarkStore");
            bookmarkStore.useBookmarkStore.getState().cleanupAllListeners();
          } catch (error) {
            console.warn("북마크 리스너 정리 중 오류:", error);
          }

          try {
            const subscriptionStore = await import("./subscriptionStore");
            subscriptionStore.useSubscriptionStore
              .getState()
              .cleanupAllListeners();
          } catch (error) {
            console.warn("구독 리스너 정리 중 오류:", error);
          }

          set({
            user: null,
            idToken: null,
            loading: false,
            isActive: null,
            isActiveLoading: false,
          });
        }
      }
    });

    // idToken 변경 감시
    const unsubscribeToken = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        set({ idToken });
      } else {
        // Firebase Auth가 null을 반환했지만 idToken이 있으면 유지
        const currentState = useAuthStore.getState();
        if (!currentState.idToken) {
          set({ idToken: null });
        }
      }
    });

    // 언마운트 시 모두 해제
    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  },
}));
