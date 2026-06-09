import { doc, getDoc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebaseCore";
import { isPermissionOrAuthError } from "./firebaseErrors";

export async function scheduleAccountDeletion(uid: string): Promise<void> {
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 14);

  await updateDoc(doc(db, "users", uid), {
    deletionScheduledAt: Timestamp.fromDate(deletionDate),
    deletionRequestedAt: serverTimestamp(),
  });
}

export async function cancelAccountDeletion(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    deletionScheduledAt: null,
    deletionRequestedAt: null,
  });
}

export async function getAccountDeletionStatus(uid: string): Promise<{
  isScheduled: boolean;
  deletionDate: Date | null;
} | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));

    if (!userDoc.exists()) {
      return null;
    }

    const deletionScheduledAt = userDoc.data().deletionScheduledAt;

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
    if (isPermissionOrAuthError(error)) {
      return null;
    }
    console.error("❌ getAccountDeletionStatus error:", error);
    return null;
  }
}
