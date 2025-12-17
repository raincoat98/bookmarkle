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
      // signOut() 전에 리스너를 먼저 정리해야 Firestore 내부 에러를 방지할 수 있습니다
      // 리스너 정리를 병렬로 처리
      await Promise.all([
        import("./bookmarkStore")
          .then((module) =>
            module.useBookmarkStore.getState().cleanupAllListeners()
          )
          .catch(() => {}),
        import("./subscriptionStore")
          .then((module) =>
            module.useSubscriptionStore.getState().cleanupAllListeners()
          )
          .catch(() => {}),
      ]);

      // 리스너 정리 후 signOut() 호출
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
    let isInitializing = true; // 초기화 중 플래그
    let lastUserUid: string | null = null; // 마지막 사용자 UID 추적
    let lastLoginTime = 0; // 마지막 로그인 시간
    let isCleaningUp = false; // 리스너 정리 중 플래그 (중복 방지)

    // 1초 타임아웃: Firebase auth callback이 호출되지 않으면 로딩 완료
    const timeoutId = setTimeout(() => {
      if (!authCallbackFired) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "⚠️ Auth callback timeout (1s) - setting loading to false"
          );
        }
        set({ loading: false });
      }
      isInitializing = false; // 타임아웃 후 초기화 완료
    }, 1000);

    // 인증 상태 감시 (user) - onAuthStateChanged 직접 사용
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      authCallbackFired = true;
      clearTimeout(timeoutId);

      const currentState = useAuthStore.getState();
      const currentUserUid = user?.uid || null;
      const now = Date.now();

      // 로그인 직후 로그아웃 콜백 방지: 최근 2초 이내에 로그인했고 현재 상태에 사용자가 있으면 무시
      if (!user && currentState.user && now - lastLoginTime < 2000) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "⚠️ Ignoring logout callback - user logged in recently (within 2s), keeping current state"
          );
        }
        // 실제 Firebase Auth 상태 확인
        const actualUser = auth.currentUser;
        if (actualUser && actualUser.uid === currentState.user?.uid) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "✅ Firebase Auth state verified, keeping current user"
            );
          }
          return; // 실제로는 로그인 상태이므로 무시
        }
      }

      // 초기화 중이고 사용자가 변경되지 않은 경우 스킵 (중복 호출 방지)
      if (isInitializing && lastUserUid === currentUserUid) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "⏭️ Skipping duplicate auth callback during initialization"
          );
        }
        isInitializing = false;
        return;
      }

      if (user) {
        // 같은 사용자인 경우 중복 업데이트 방지
        if (
          currentState.user?.uid === user.uid &&
          !isInitializing &&
          now - lastLoginTime < 1000
        ) {
          if (process.env.NODE_ENV === "development") {
            console.log("⏭️ Skipping duplicate login callback for same user");
          }
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Auth callback fired: user logged in -", user.email);
        }
        lastUserUid = user.uid;
        lastLoginTime = now;
        isInitializing = false;
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
        // 로그아웃 콜백: 실제 로그아웃인지 확인
        const actualUser = auth.currentUser;
        if (actualUser) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "⚠️ Auth callback returned null but auth.currentUser exists, ignoring"
            );
          }
          return; // 실제로는 로그인 상태이므로 무시
        }

        // 실제 로그아웃: signOut()이 호출되어 user가 null이 된 경우
        // 리스너는 이미 logout()에서 정리되었으므로 여기서는 상태만 업데이트
        if (!currentState.user && !currentState.idToken) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "✅ Auth callback fired: user logged out (no previous state)"
            );
          }
          lastUserUid = null;
          lastLoginTime = 0;
          isInitializing = false;

          set({
            user: null,
            idToken: null,
            loading: false,
            isActive: null,
            isActiveLoading: false,
          });
        } else {
          // 현재 상태에 사용자가 있지만 Firebase Auth가 null인 경우
          // 익스텐션 새로고침 시 일시적으로 null이 될 수 있으므로 상태 유지
          if (process.env.NODE_ENV === "development") {
            console.log(
              "⚠️ Firebase Auth returned null but user exists in state, keeping state"
            );
          }

          // 리스너를 정리하여 권한 오류를 방지 (중복 방지)
          if (!isCleaningUp) {
            isCleaningUp = true;
            if (process.env.NODE_ENV === "development") {
              console.log(
                "🧹 임시 리스너 정리 (Firebase Auth 재동기화 대기 중)"
              );
            }

            // 병렬로 리스너 정리
            Promise.all([
              import("./bookmarkStore")
                .then((module) =>
                  module.useBookmarkStore.getState().cleanupAllListeners()
                )
                .catch(() => {}),
              import("./subscriptionStore")
                .then((module) =>
                  module.useSubscriptionStore.getState().cleanupAllListeners()
                )
                .catch(() => {}),
            ]).finally(() => {
              isCleaningUp = false;
            });
          }

          set({ loading: false });
          set({ isActive: null, isActiveLoading: false });
        }
      }
    });

    // idToken 변경 감시
    const unsubscribeToken = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const currentState = useAuthStore.getState();
          // 같은 사용자이고 idToken이 이미 설정되어 있으면 중복 업데이트 방지
          if (
            currentState.user?.uid === user.uid &&
            currentState.idToken === idToken
          ) {
            return;
          }
          set({ idToken });
        } catch (error) {
          console.error("idToken 가져오기 실패:", error);
        }
      } else {
        // Firebase Auth가 null을 반환했지만 실제로는 로그인 상태일 수 있음
        const actualUser = auth.currentUser;
        if (actualUser) {
          // 실제로는 로그인 상태이므로 idToken 유지
          return;
        }

        // 실제 로그아웃 상태인 경우에만 idToken 제거
        const currentState = useAuthStore.getState();
        if (!currentState.user && !currentState.idToken) {
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
