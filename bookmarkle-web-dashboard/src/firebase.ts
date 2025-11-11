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
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, googleProvider);

  // 사용자 정보를 Firestore에 저장 (오류가 발생해도 로그인은 성공)
  if (result.user) {
    try {
      await saveUserToFirestore(result.user, false);
    } catch (error) {
      console.error("Firestore 저장 실패 (로그인은 성공):", error);
    }
  }

  return result;
}

// 이메일/패스워드 로그인
export async function loginWithEmail(email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, password);

  // 사용자 정보를 Firestore에 저장
  if (result.user) {
    await saveUserToFirestore(result.user, false);
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

  // 사용자 정보를 Firestore에 저장 (신규 사용자)
  if (userCredential.user) {
    await saveUserToFirestore(userCredential.user, true);
  }

  return userCredential;
}

// 비밀번호 재설정
export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export function logout() {
  return signOut(auth);
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
