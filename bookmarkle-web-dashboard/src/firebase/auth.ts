import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "./core";
import { saveUserToFirestore } from "./user";

type PopupLoginError = {
  code?: string;
  message?: string;
};

const isPopupBlockedError = (error: PopupLoginError): boolean =>
  error.code === "auth/popup-blocked" ||
  error.code === "auth/popup-closed-by-user" ||
  Boolean(
    error.message?.includes("Cross-Origin-Opener-Policy") ||
      error.message?.includes("blocked by browser") ||
      error.message?.includes("popup blocked") ||
      error.message?.includes("cross-origin") ||
      error.message?.includes("Pending promise was never set")
  );

const isFirebaseStorageKey = (key: string): boolean =>
  key.startsWith("firebase:") ||
  key.startsWith("firebaseui:") ||
  key.includes("firebase-session") ||
  key.includes("__firebase");

const removeMatchingStorageKeys = (storage: Storage): number => {
  const keys = Array.from({ length: storage.length }, (_, i) =>
    storage.key(i)
  ).filter((key): key is string => !!key && isFirebaseStorageKey(key));

  keys.forEach((key) => storage.removeItem(key));
  return keys.length;
};

export async function loginWithGoogle() {
  try {
    console.log("🔄 Attempting signInWithPopup...");
    const result = await signInWithPopup(auth, googleProvider);

    console.log("✅ Login successful:", result.user.email);
    await saveUserToFirestore(result.user);

    return result;
  } catch (error: unknown) {
    const err = error as PopupLoginError;

    if (isPopupBlockedError(err)) {
      console.log("⚠️ Popup blocked, falling back to redirect...");
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    console.error("❌ Google login failed:", err.code, err.message);
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, password);

  await saveUserToFirestore(result.user);

  return result;
}

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

  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }

  await saveUserToFirestore(userCredential.user);

  return userCredential;
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  if (import.meta.env.DEV) {
    console.log("🧹 Clearing Firebase storage");
  }
  await clearFirebaseStorage();

  await signOut(auth);
  if (import.meta.env.DEV) {
    console.log("✅ Logout completed");
  }
}

export async function clearFirebaseStorage() {
  try {
    if (import.meta.env.DEV) {
      console.log("🧹 Starting Firebase storage cleanup...");
    }

    const localKeyCount = removeMatchingStorageKeys(localStorage);
    if (import.meta.env.DEV) {
      console.log(`✅ localStorage cleared: ${localKeyCount} keys`);
    }

    const sessionKeyCount = removeMatchingStorageKeys(sessionStorage);
    if (import.meta.env.DEV) {
      console.log(`✅ sessionStorage cleared: ${sessionKeyCount} keys`);
      console.log("✅ Firebase storage cleanup completed");
    }
  } catch (error) {
    console.error("❌ Error clearing Firebase storage:", error);
  }
}
