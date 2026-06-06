import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Auth 및 Firestore 인스턴스
export const auth = getAuth(app);
// IndexedDB 오프라인 캐시 활성화: 재방문 시 캐시에서 즉시 데이터 반환
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const googleProvider = new GoogleAuthProvider();

// 관리자 이메일 목록
const ADMIN_EMAILS = [
  import.meta.env.VITE_ADMIN_EMAIL || "admin@bookmarkle.com",
  "ww57403@gmail.com",
];

// 사용자 정보를 Firestore에 저장
async function saveUserToFirestore(user: User, isNewUser: boolean = false) {
  const userRef = doc(db, "users", user.uid);
  const isAdminUser = ADMIN_EMAILS.includes(user.email || "");

  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    provider: user.providerData[0]?.providerId || "email",
    isAdmin: isAdminUser, // 관리자 여부 추가
    updatedAt: serverTimestamp(),
  };

  if (isNewUser) {
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
    });
  } else {
    await setDoc(userRef, userData, { merge: true });
  }

  // 관리자 사용자라면 별도로 admins 컬렉션에도 추가
  if (isAdminUser) {
    const adminRef = doc(db, "admins", user.uid);
    await setDoc(
      adminRef,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

/**
 * Google 계정으로 로그인 (팝업 → 리다이렉트 폴백)
 */
export async function loginWithGoogle() {
  try {
    console.log("🔄 Attempting signInWithPopup...");
    const result = await signInWithPopup(auth, googleProvider);

    console.log("✅ Login successful:", result.user.email);
    await saveUserToFirestore(result.user, false);

    return result;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; name?: string };

    // 팝업 차단 관련 에러 체크
    const isPopupBlockedError =
      err?.code === "auth/popup-blocked" ||
      err?.code === "auth/popup-closed-by-user" ||
      err?.message?.includes("Cross-Origin-Opener-Policy") ||
      err?.message?.includes("blocked by browser") ||
      err?.message?.includes("popup blocked") ||
      err?.message?.includes("cross-origin") ||
      err?.message?.includes("Pending promise was never set");

    if (isPopupBlockedError) {
      console.log("⚠️ Popup blocked, falling back to redirect...");
      await signInWithRedirect(auth, googleProvider);
      return; // 리다이렉트는 페이지 이동으로 여기 도달 안 함
    }

    console.error("❌ Google login failed:", err?.code, err?.message);
    throw error;
  }
}

/**
 * 이메일/패스워드 로그인
 */
export async function loginWithEmail(email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, password);

  await saveUserToFirestore(result.user, false);

  return result;
}

/**
 * 이메일/패스워드 회원가입
 */
export async function signupWithEmail(
  email: string,
  password: string,
  displayName?: string
) {
  await setPersistence(auth, browserLocalPersistence);
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  // 표시 이름 설정
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }

  // 신규 사용자 정보 저장
  await saveUserToFirestore(userCredential.user, true);

  return userCredential;
}

/**
 * 비밀번호 재설정 이메일 발송
 */
export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * 로그아웃 (Extension 컨텍스트 감지 및 세션 클리어)
 */
export async function logout() {
  if (process.env.NODE_ENV === "development") {
    console.log("🧹 Clearing Firebase storage");
  }
  await clearFirebaseStorage();

  // Firebase Auth 로그아웃
  await signOut(auth);
  if (process.env.NODE_ENV === "development") {
    console.log("✅ Logout completed");
  }
}

/**
 * Firebase 로컬 저장소 완전 클리어
 */
export async function clearFirebaseStorage() {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("🧹 Starting Firebase storage cleanup...");
    }

    const isFirebaseKey = (key: string) =>
      key.startsWith("firebase:") ||
      key.startsWith("firebaseui:") ||
      key.includes("firebase-session") ||
      key.includes("__firebase");

    // localStorage 클리어
    const localKeys = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.key(i)
    ).filter((key): key is string => !!key && isFirebaseKey(key));

    localKeys.forEach((key) => localStorage.removeItem(key));
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ localStorage cleared: ${localKeys.length} keys`);
    }

    // sessionStorage 클리어
    const sessionKeys = Array.from({ length: sessionStorage.length }, (_, i) =>
      sessionStorage.key(i)
    ).filter((key): key is string => !!key && isFirebaseKey(key));

    sessionKeys.forEach((key) => sessionStorage.removeItem(key));
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ sessionStorage cleared: ${sessionKeys.length} keys`);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Firebase storage cleanup completed");
    }
  } catch (error) {
    console.error("❌ Error clearing Firebase storage:", error);
  }
}

export async function getUserDefaultPage(uid: string): Promise<string> {
  // Firebase Auth가 동기화되지 않았으면 기본값 반환
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return "dashboard";
  }

  try {
    const settingsRef = doc(db, "users", uid, "settings", "main");
    const snap = await getDoc(settingsRef);
    if (snap.exists() && snap.data().defaultPage) {
      return snap.data().defaultPage;
    }
    return "dashboard";
  } catch (error) {
    const err = error as { code?: string; message?: string };
    // 권한 오류는 조용히 무시 (로그아웃 중일 수 있음)
    if (err?.code === "permission-denied" || err?.code === "unauthenticated") {
      console.warn(
        "⚠️ getUserDefaultPage: Permission denied, returning default"
      );
      return "dashboard";
    }
    console.error("❌ getUserDefaultPage error:", error);
    return "dashboard";
  }
}

export async function setUserDefaultPage(
  uid: string,
  value: string
): Promise<void> {
  const settingsRef = doc(db, "users", uid, "settings", "main");
  await setDoc(settingsRef, { defaultPage: value }, { merge: true });
}

// 알림 설정 가져오기
export async function getUserNotificationSettings(uid: string): Promise<{
  notifications?: boolean;
  bookmarkNotifications?: boolean;
  systemNotifications?: boolean;
}> {
  // Firebase Auth가 동기화되지 않았으면 기본값 반환
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return {
      notifications: true,
      bookmarkNotifications: true,
      systemNotifications: true,
    };
  }

  try {
    const settingsRef = doc(db, "users", uid, "settings", "main");
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        notifications:
          data.notifications !== undefined ? data.notifications : true,
        bookmarkNotifications:
          data.bookmarkNotifications !== undefined
            ? data.bookmarkNotifications
            : true,
        systemNotifications:
          data.systemNotifications !== undefined
            ? data.systemNotifications
            : data.notifications !== undefined
            ? data.notifications
            : true,
      };
    }
    return {
      notifications: true,
      bookmarkNotifications: true,
      systemNotifications: true,
    };
  } catch (error) {
    const err = error as { code?: string; message?: string };
    // 권한 오류는 조용히 무시하고 기본값 반환 (로그아웃 중일 수 있음)
    if (err?.code === "permission-denied" || err?.code === "unauthenticated") {
      console.warn(
        "⚠️ getUserNotificationSettings: Permission denied, returning defaults"
      );
      return {
        notifications: true,
        bookmarkNotifications: true,
        systemNotifications: true,
      };
    }
    console.error("❌ getUserNotificationSettings error:", error);
    // 에러 발생 시 기본값 반환
    return {
      notifications: true,
      bookmarkNotifications: true,
      systemNotifications: true,
    };
  }
}

// 알림 설정 저장
export async function setUserNotificationSettings(
  uid: string,
  settings: {
    notifications?: boolean;
    bookmarkNotifications?: boolean;
    systemNotifications?: boolean;
  }
): Promise<void> {
  const settingsRef = doc(db, "users", uid, "settings", "main");
  await setDoc(settingsRef, settings, { merge: true });
}

// 날씨 위치 정보 가져오기
export async function getUserWeatherLocation(uid: string): Promise<{
  lat: number;
  lon: number;
  city: string;
} | null> {
  // Firebase Auth가 동기화되지 않았으면 null 반환
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  try {
    const settingsRef = doc(db, "users", uid, "settings", "main");
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      const data = snap.data();
      if (
        data.weatherLocation &&
        data.weatherLocation.lat &&
        data.weatherLocation.lon
      ) {
        return {
          lat: data.weatherLocation.lat,
          lon: data.weatherLocation.lon,
          city: data.weatherLocation.city || "",
        };
      }
    }
    return null;
  } catch (error) {
    const err = error as { code?: string; message?: string };
    // 권한 오류는 조용히 무시 (로그아웃 중일 수 있음)
    if (err?.code === "permission-denied" || err?.code === "unauthenticated") {
      console.warn(
        "⚠️ getUserWeatherLocation: Permission denied, returning null"
      );
      return null;
    }
    console.error("❌ getUserWeatherLocation error:", error);
    return null;
  }
}

// 날씨 위치 정보 저장
export async function setUserWeatherLocation(
  uid: string,
  location: {
    lat: number;
    lon: number;
    city: string;
  }
): Promise<void> {
  const settingsRef = doc(db, "users", uid, "settings", "main");
  await setDoc(
    settingsRef,
    {
      weatherLocation: {
        lat: location.lat,
        lon: location.lon,
        city: location.city,
      },
    },
    { merge: true }
  );
}

/**
 * 이메일 기반 관리자 확인 (동기)
 */
export function isAdmin(user: User | null): boolean {
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
}

/**
 * Firestore에서 관리자 권한 확인 (비동기)
 */
export async function isAdminUser(user: User | null): Promise<boolean> {
  if (!user) return false;

  // 이메일 기반 우선 체크
  if (ADMIN_EMAILS.includes(user.email || "")) {
    return true;
  }

  // Firestore users 컬렉션의 isAdmin 필드 체크
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    return userDoc.exists() && userDoc.data()?.isAdmin === true;
  } catch (error) {
    const err = error as { code?: string; message?: string };
    // 권한 오류는 조용히 무시 (로그아웃 중일 수 있음)
    if (err?.code === "permission-denied" || err?.code === "unauthenticated") {
      // 권한 오류는 조용히 무시
      return false;
    }
    console.error("관리자 권한 확인 오류:", error);
    return false;
  }
}

/**
 * UID로 admins 컬렉션에서 관리자 권한 확인
 */
export async function checkAdminStatus(uid: string): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, "admins", uid));
    return adminDoc.exists();
  } catch (error) {
    const err = error as { code?: string; message?: string };
    // 권한 오류는 조용히 무시 (로그아웃 중일 수 있음)
    if (err?.code === "permission-denied" || err?.code === "unauthenticated") {
      // 권한 오류는 조용히 무시
      return false;
    }
    console.error("관리자 권한 확인 오류:", error);
    return false;
  }
}

/**
 * Firebase Refresh Token 추출
 * Extension에서 토큰 갱신 시 사용
 */
export function getRefreshToken(): string | null {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn("🔐 현재 로그인된 사용자 없음");
      return null;
    }

    // 방법 1: stsTokenManager에서 직접 접근 (비공개 API이지만 실제로 작동)
    if (
      (user as any).stsTokenManager &&
      (user as any).stsTokenManager.refreshToken
    ) {
      const refreshToken = (user as any).stsTokenManager.refreshToken;
      console.log("✅ Refresh Token 추출 완료 (stsTokenManager)");
      return refreshToken;
    }

    // 방법 2: localStorage에서 Firebase 세션 정보 읽기
    const firebaseKey = `firebase:authUser:${firebaseConfig.apiKey}:[DEFAULT]`;
    const authUserData = localStorage.getItem(firebaseKey);

    if (authUserData) {
      try {
        const parsed = JSON.parse(authUserData);
        if (parsed.stsTokenManager?.refreshToken) {
          console.log("✅ Refresh Token 추출 완료 (localStorage)");
          return parsed.stsTokenManager.refreshToken;
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

/**
 * 계정 삭제 예약 (14일 후 삭제)
 */
export async function scheduleAccountDeletion(uid: string): Promise<void> {
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 14); // 14일 후

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    deletionScheduledAt: Timestamp.fromDate(deletionDate),
    deletionRequestedAt: serverTimestamp(),
  });
}

/**
 * 계정 삭제 취소
 */
export async function cancelAccountDeletion(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    deletionScheduledAt: null,
    deletionRequestedAt: null,
  });
}

/**
 * 계정 삭제 예약 상태 확인
 */
export async function getAccountDeletionStatus(uid: string): Promise<{
  isScheduled: boolean;
  deletionDate: Date | null;
} | null> {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    const deletionScheduledAt = data.deletionScheduledAt;

    if (deletionScheduledAt && deletionScheduledAt instanceof Timestamp) {
      return {
        isScheduled: true,
        deletionDate: deletionScheduledAt.toDate(),
      };
    }

    return {
      isScheduled: false,
      deletionDate: null,
    };
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "permission-denied" || err?.code === "unauthenticated") {
      return null;
    }
    console.error("❌ getAccountDeletionStatus error:", error);
    return null;
  }
}

export default app;
