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

// 팝업 차단/사파리 이슈 시 redirect로 대체 가능
export async function loginWithGoogle() {
  try {
    // 팝업으로 로그인 시도
    console.log("🔄 Attempting signInWithPopup...");
    const result = await signInWithPopup(auth, googleProvider);

    if (result.user) {
      console.log("✅ Login successful:", result.user.email);
      saveUserToFirestore(result.user, false).catch((error) => {
        console.error("Firestore 저장 실패 (로그인은 성공):", error);
      });
    }

    return result;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    // 팝업이 차단되거나 COOP 정책 위반 시 리다이렉트로 폴백
    if (
      err?.code === "auth/popup-blocked" ||
      err?.code === "auth/popup-closed-by-user" ||
      (err?.message && err.message.includes("Cross-Origin-Opener-Policy"))
    ) {
      console.log("⚠️ Popup blocked/COOP error, falling back to redirect...");
      // signInWithRedirect는 페이지를 이동시킴
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        console.error("❌ Redirect login failed:", redirectError);
        throw redirectError;
      }
      // signInWithRedirect succeeds with navigation, won't reach here
      return;
    }

    // 네트워크 에러나 기타 에러는 그대로 throw
    console.error("❌ Google login failed:", err?.code, err?.message);
    throw error;
  }
}

// 이메일/패스워드 로그인
export async function loginWithEmail(email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, password);

  // 사용자 정보를 Firestore에 저장 (non-blocking)
  if (result.user) {
    saveUserToFirestore(result.user, false).catch((error) => {
      console.error("Firestore 저장 실패 (로그인은 성공):", error);
    });
  }

  return result;
}

// 회원가입
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

  // 사용자 프로필 업데이트 (표시 이름)
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }

  // 사용자 정보를 Firestore에 저장 (신규 사용자, non-blocking)
  if (userCredential.user) {
    saveUserToFirestore(userCredential.user, true).catch((error) => {
      console.error("Firestore 저장 실패 (가입은 성공):", error);
    });
  }

  return userCredential;
}

// 비밀번호 재설정
export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  // Firebase 세션 완전 클리어
  await clearFirebaseStorage();

  // 확장 프로그램에 LOGOUT_SUCCESS 메시지 전송
  try {
    const extensionId = import.meta.env.VITE_EXTENSION_ID;

    if (extensionId && typeof window !== "undefined") {
      const chromeRuntime = (window as unknown as Record<string, unknown>)
        .chrome as
        | {
            runtime?: {
              sendMessage?: (
                extensionId: string,
                msg: unknown,
                callback: () => void
              ) => void;
            };
          }
        | undefined;

      if (chromeRuntime?.runtime?.sendMessage) {
        try {
          chromeRuntime.runtime.sendMessage(
            extensionId,
            { type: "LOGOUT_SUCCESS" },
            () => {
              console.log("✅ LOGOUT_SUCCESS sent to extension");
            }
          );
        } catch (error) {
          console.warn("Failed to send LOGOUT_SUCCESS to extension:", error);
        }
      }
    }
  } catch (error) {
    console.warn("Error notifying extension about logout:", error);
  }

  // Firebase Auth 로그아웃
  const signOutResult = await signOut(auth);

  // 로그아웃 완료 후 구글 프로바이더 상태 초기화
  console.log("🔄 Resetting GoogleAuthProvider state after logout");

  return signOutResult;
}

/**
 * Firebase 로컬 저장소 완전 클리어
 * signInWithPopup.js에서 이관됨
 */
export async function clearFirebaseStorage() {
  try {
    console.log("🧹 Starting comprehensive Firebase storage cleanup...");

    // 1. localStorage에서 Firebase 관련 키 제거
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("firebase:") ||
          key.startsWith("firebaseui:") ||
          key.includes("firebase-session") ||
          key.includes("__firebase"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`  ✅ Removed localStorage: ${key}`);
    });
    console.log(`✅ localStorage cleared: ${keysToRemove.length} keys removed`);

    // 2. sessionStorage에서 Firebase 관련 키 제거
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.startsWith("firebase:") ||
          key.startsWith("firebaseui:") ||
          key.includes("firebase-session") ||
          key.includes("__firebase"))
      ) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((key) => {
      sessionStorage.removeItem(key);
      console.log(`  ✅ Removed sessionStorage: ${key}`);
    });
    console.log(
      `✅ sessionStorage cleared: ${sessionKeysToRemove.length} keys removed`
    );

    // 3. IndexedDB는 비동기로 처리 (로그아웃을 블로킹하지 않음)
    if ("indexedDB" in window) {
      try {
        interface IDBDatabaseInfo {
          name: string;
        }
        const databases = await (
          indexedDB as { databases: () => Promise<IDBDatabaseInfo[]> }
        ).databases();
        const firebaseDbs = databases.filter(
          (db: IDBDatabaseInfo) =>
            db.name &&
            (db.name.includes("firebase") ||
              db.name.includes("firebaseLocalStorageDb") ||
              db.name.includes("__firebase"))
        );

        for (const db of firebaseDbs) {
          if (db.name) {
            console.log(`  🗑️ Deleting IndexedDB: ${db.name}`);
            indexedDB.deleteDatabase(db.name);
            console.log(`  ✅ Deleted: ${db.name}`);
          }
        }
        console.log(
          `✅ IndexedDB cleared: ${firebaseDbs.length} databases deleted`
        );
      } catch (error) {
        console.warn("⚠️ IndexedDB clear failed:", error);
      }
    }

    console.log("✅ Firebase storage clearing completed successfully");
  } catch (error) {
    console.error("❌ Error clearing Firebase storage:", error);
  }
}

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

// 관리자 ID 목록 (환경 변수 또는 하드코딩)
const ADMIN_EMAILS = [
  import.meta.env.VITE_ADMIN_EMAIL || "admin@bookmarkle.com",
  "ww57403@gmail.com", // 임시 하드코딩 추가
];

// 관리자 확인 함수
export function isAdmin(user: User | null): boolean {
  if (!user || !user.email) {
    console.log("isAdmin: 사용자가 없거나 이메일이 없음", {
      user: user?.email,
    });
    return false;
  }

  const isAdminUser = ADMIN_EMAILS.includes(user.email);
  console.log("isAdmin 체크:", {
    userEmail: user.email,
    adminEmails: ADMIN_EMAILS,
    isAdmin: isAdminUser,
  });

  return isAdminUser;
}

// 관리자 권한 확인 (비동기 - Firestore에서 확인)
export async function checkAdminStatus(uid: string): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, "admins", uid));
    return adminDoc.exists();
  } catch (error) {
    console.error("관리자 권한 확인 오류:", error);
    return false;
  }
}

// Firestore에서 사용자 데이터를 가져와서 isAdmin 필드 체크
export async function isAdminFromFirestore(
  user: User | null
): Promise<boolean> {
  if (!user) return false;

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error("Firestore에서 관리자 권한 확인 오류:", error);
    return false;
  }
}

// 관리자 권한 확인 (사용자 객체로)
export async function isAdminUser(user: User | null): Promise<boolean> {
  if (!user) return false;

  // 이메일 기반 체크 (기본)
  if (ADMIN_EMAILS.includes(user.email || "")) {
    return true;
  }

  // Firestore isAdmin 필드 체크
  try {
    return await isAdminFromFirestore(user);
  } catch (error) {
    console.error("관리자 권한 확인 오류:", error);
    return false;
  }
}

export default app;
