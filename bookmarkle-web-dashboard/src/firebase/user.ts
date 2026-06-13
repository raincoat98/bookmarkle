import type { User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ADMIN_EMAILS, db } from "./core";

export async function saveUserToFirestore(
  user: User,
  isNewUser: boolean = false
) {
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

  if (isNewUser) {
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
    });
  } else {
    await setDoc(userRef, userData, { merge: true });
  }

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
