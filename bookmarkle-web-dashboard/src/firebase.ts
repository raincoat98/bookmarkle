import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
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
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
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
export const db = getFirestore(app);
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
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

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
  const isExtension = 
    window.location.search.includes("source=extension") ||
    window.location.pathname.includes("/extension-login");

  // Extension이 아닌 경우만 Firebase 저장소 클리어
  if (!isExtension) {
    console.log("🧹 Clearing Firebase storage (non-extension context)");
    await clearFirebaseStorage();
  }


  // Firebase Auth 로그아웃
  await signOut(auth);
  console.log("✅ Logout completed");
}

/**
 * Firebase 로컬 저장소 완전 클리어
 */
export async function clearFirebaseStorage() {
  try {
    console.log("🧹 Starting Firebase storage cleanup...");

    const isFirebaseKey = (key: string) => 
      key.startsWith("firebase:") ||
      key.startsWith("firebaseui:") ||
      key.includes("firebase-session") ||
      key.includes("__firebase");

    // localStorage 클리어
    const localKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
      .filter((key): key is string => !!key && isFirebaseKey(key));
    
    localKeys.forEach(key => localStorage.removeItem(key));
    console.log(`✅ localStorage cleared: ${localKeys.length} keys`);

    // sessionStorage 클리어
    const sessionKeys = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i))
      .filter((key): key is string => !!key && isFirebaseKey(key));
    
    sessionKeys.forEach(key => sessionStorage.removeItem(key));
    console.log(`✅ sessionStorage cleared: ${sessionKeys.length} keys`);

    console.log("✅ Firebase storage cleanup completed");
  } catch (error) {
    console.error("❌ Error clearing Firebase storage:", error);
  }
}

/**
 * Firebase Auth 상태 변경 감시
 */
export function watchAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function getUserDefaultPage(uid: string): Promise<string> {
  const db = getFirestore();
  const settingsRef = doc(db, "users", uid, "settings", "main");
  const snap = await getDoc(settingsRef);
  if (snap.exists() && snap.data().defaultPage) {
    return snap.data().defaultPage;
  }
  return "dashboard";
}

export async function setUserDefaultPage(
  uid: string,
  value: string
): Promise<void> {
  const db = getFirestore();
  const settingsRef = doc(db, "users", uid, "settings", "main");
  await setDoc(settingsRef, { defaultPage: value }, { merge: true });
}

// 알림 설정 가져오기
export async function getUserNotificationSettings(uid: string): Promise<{
  notifications?: boolean;
  bookmarkNotifications?: boolean;
  systemNotifications?: boolean;
}> {
  const db = getFirestore();
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
  const db = getFirestore();
  const settingsRef = doc(db, "users", uid, "settings", "main");
  await setDoc(settingsRef, settings, { merge: true });
}

// 날씨 위치 정보 가져오기
export async function getUserWeatherLocation(uid: string): Promise<{
  lat: number;
  lon: number;
  city: string;
} | null> {
  const db = getFirestore();
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
  const db = getFirestore();
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
    console.error("관리자 권한 확인 오류:", error);
    return false;
  }
}

export default app;
