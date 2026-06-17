import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ADMIN_EMAILS, db } from "./core";

export async function saveUserToFirestore(user: User) {
  const userRef = doc(db, "users", user.uid);
  const isAdminUser = ADMIN_EMAILS.includes(user.email || "");

  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    provider: user.providerData[0]?.providerId || "email",
    isAdmin: isAdminUser,
    updatedAt: serverTimestamp(),
  };

  // createdAt이 없는 신규/레거시 사용자에게만 가입일을 기록한다.
  // 기존 createdAt은 절대 덮어쓰지 않는다.
  const snapshot = await getDoc(userRef);
  const needsCreatedAt = !snapshot.exists() || !snapshot.data().createdAt;

  await setDoc(
    userRef,
    needsCreatedAt ? { ...userData, createdAt: serverTimestamp() } : userData,
    { merge: true }
  );

  if (isAdminUser) {
    await setDoc(
      doc(db, "admins", user.uid),
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
