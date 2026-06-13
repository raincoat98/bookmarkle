import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ADMIN_EMAILS, db } from "./firebaseCore";
import { isPermissionOrAuthError } from "./firebaseErrors";

export function isAdmin(user: User | null): boolean {
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
}

export async function isAdminUser(user: User | null): Promise<boolean> {
  if (!user) return false;

  if (ADMIN_EMAILS.includes(user.email || "")) {
    return true;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    return userDoc.exists() && userDoc.data()?.isAdmin === true;
  } catch (error) {
    if (isPermissionOrAuthError(error)) {
      return false;
    }
    console.error("관리자 권한 확인 오류:", error);
    return false;
  }
}

export async function checkAdminStatus(uid: string): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, "admins", uid));
    return adminDoc.exists();
  } catch (error) {
    if (isPermissionOrAuthError(error)) {
      return false;
    }
    console.error("관리자 권한 확인 오류:", error);
    return false;
  }
}
