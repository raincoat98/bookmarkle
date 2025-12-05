import { create } from "zustand";
import { watchAuth, auth } from "../firebase";
import type { User } from "firebase/auth";
import type { FirestoreUser } from "../types";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import {
  db,
  loginWithGoogle,
  loginWithEmail as fbLoginWithEmail,
  signupWithEmail,
  logout as fbLogout,
} from "../firebase";
import { getRedirectResult } from "firebase/auth";

// 사용자 정보를 Firestore에 저장 (로컬 함수)
async function saveUserToFirestore(user: User) {
  const userRef = doc(db, "users", user.uid);
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    provider: user.providerData[0]?.providerId || "email",
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, userData, { merge: true });
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
  saveUserToFirestore: (firebaseUser: User) => Promise<void>;
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
      return true; // 에러 시 기본적으로 활성화
    } finally {
      set({ isActiveLoading: false });
    }
  },

  // Firestore에 사용자 데이터 저장
  saveUserToFirestore: async (firebaseUser: User) => {
    try {
      const userData: FirestoreUser = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        provider: firebaseUser.providerData[0]?.providerId || "email",
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userData, {
        merge: true,
      });
    } catch (error) {
      console.error("Firestore에 사용자 데이터 저장 실패:", error);
    }
  },

  // Google 로그인
  login: async () => {
    try {
      console.log("🔄 Calling loginWithGoogle()...");
      await loginWithGoogle();
      // Firestore save is handled by firebase.ts, no need to save again
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // 이메일 로그인
  loginWithEmail: async (email: string, password: string) => {
    try {
      const result = await fbLoginWithEmail(email, password);
      if (result.user) {
        // Fire and forget - don't block on Firestore write
        get().saveUserToFirestore(result.user).catch(console.error);
      }
    } catch (error) {
      console.error("Email login error:", error);
      throw error;
    }
  },

  // 회원가입
  signup: async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await signupWithEmail(
        email,
        password,
        displayName
      );
      if (userCredential.user) {
        // Fire and forget - don't block on Firestore write
        get().saveUserToFirestore(userCredential.user).catch(console.error);
      }
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      // sessionStorage에서 extension auth 플래그 초기화
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith("extension_auth_sent")) {
          sessionStorage.removeItem(key);
        }
      });

      // 확장프로그램에 로그아웃 신호 보내기
      try {
        window.parent.postMessage({ type: "LOGOUT_SUCCESS" }, "*");
        console.log("📤 Logout signal sent to extension");
      } catch (error) {
        console.log("로그아웃 신호 전송 실패 (무시):", error);
      }

      await fbLogout();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },

  // 인증 상태 초기화 및 감시
  initializeAuth: () => {
    let authCallbackFired = false;

    // 리다이렉트 로그인 결과 확인 (signInWithRedirect 폴백 후 돌아온 경우)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("✅ Redirect login successful:", result.user.email);
          // Firestore save for redirect result
          saveUserToFirestore(result.user).catch((error) => {
            console.error("Firestore save failed after redirect:", error);
          });
        }
      })
      .catch((error: unknown) => {
        const err = error as { code?: string; message?: string };
        // INAPP_LINK_FAILURE는 정상적인 경우임 (리다이렉트 결과가 없음)
        if (err?.code !== "auth/inapp-link-failure") {
          console.error("❌ Redirect result error:", err?.code, err?.message);
        }
      });

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
        // Don't await - load user status in background
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
