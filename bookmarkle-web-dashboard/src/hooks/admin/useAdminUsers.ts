import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getCountFromServer,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { BETA_END_DATE } from "../../utils/earlyUser";
import type { AdminUser } from "../../types";

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!auth.currentUser) return;

      const usersSnapshot = await getDocs(collection(db, "users"));

      const usersData = await Promise.all(
        usersSnapshot.docs.map(async (userDoc) => {
          const userData = userDoc.data();
          const uid = userDoc.id;

          const [bookmarksSnap, collectionsSnap] = await Promise.all([
            getCountFromServer(
              query(collection(db, "bookmarks"), where("userId", "==", uid))
            ).catch(() => null),
            getCountFromServer(
              query(collection(db, "collections"), where("userId", "==", uid))
            ).catch(() => null),
          ]);

          const createdAt: Date = userData.createdAt?.toDate() ?? new Date();

          let subscription: AdminUser["subscription"] = undefined;
          if (userData.subscription) {
            const sub = userData.subscription;
            subscription = {
              plan: sub.plan ?? "free",
              status: sub.status ?? "expired",
              billingCycle: sub.billingCycle ?? "monthly",
              startDate: sub.startDate?.toDate() ?? new Date(),
              endDate: sub.endDate?.toDate(),
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
              subscriptionId: sub.subscriptionId,
              customerId: sub.customerId,
              trialEndDate: sub.trialEndDate?.toDate(),
            };
          }

          return {
            uid,
            email: userData.email ?? null,
            displayName: userData.displayName ?? null,
            createdAt,
            bookmarkCount: bookmarksSnap?.data().count ?? 0,
            collectionCount: collectionsSnap?.data().count ?? 0,
            lastLoginAt: userData.lastLoginAt?.toDate(),
            isActive: userData.isActive !== false,
            isEarlyUser: createdAt < BETA_END_DATE,
            subscription,
          } satisfies AdminUser;
        })
      );

      setUsers(usersData);
    } catch (err: unknown) {
      console.error("사용자 목록 로드 오류:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load user list."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (uid: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, "users", uid), {
        isActive,
        updatedAt: new Date(),
      });
      setUsers((prev) =>
        prev.map((user) => (user.uid === uid ? { ...user, isActive } : user))
      );
    } catch (err: unknown) {
      console.error("사용자 상태 변경 실패:", err);
      setError(
        err instanceof Error ? err.message : "Failed to change user status."
      );
    }
  };

  return { users, loading, error, refetch: loadUsers, toggleUserStatus };
}
