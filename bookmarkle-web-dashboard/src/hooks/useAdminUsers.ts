import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import type { AdminUser, Subscription } from "../types";

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

      // 현재 사용자 정보 확인
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("현재 사용자:", {
          uid: currentUser.uid,
          email: currentUser.email,
        });
      }

      // 모든 사용자의 북마크와 컬렉션 정보를 가져오기
      const usersData: AdminUser[] = [];

      // users 목록은 인증만 되면 읽기 허용이니 필터 없어도 됨
      const usersSnapshot = await getDocs(collection(db, "users"));

      console.log("관리자 권한으로 users 컬렉션 접근 성공");

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const uid = userDoc.id;

        let bookmarkCount = 0;
        let collectionCount = 0;

        try {
          // 루트 컬렉션에서 해당 사용자의 북마크 개수 가져오기
          const bookmarksQuery = query(
            collection(db, "bookmarks"),
            where("userId", "==", uid)
          );
          const bookmarksSnapshot = await getDocs(bookmarksQuery);
          bookmarkCount = bookmarksSnapshot.size;
          console.log(
            `사용자 ${uid} (${userData.email})의 북마크 개수: ${bookmarkCount}`
          );
          if (bookmarkCount > 0) {
            console.log(
              `  - 북마크 문서 ID들:`,
              bookmarksSnapshot.docs.map((d) => d.id)
            );
          }
        } catch (bookmarkError: unknown) {
          const error = bookmarkError as { code?: string; message?: string };
          console.error(`사용자 ${uid}의 북마크 로드 실패:`, {
            error: bookmarkError,
            code: error.code,
            message: error.message || String(bookmarkError),
          });
        }

        try {
          // 루트 컬렉션에서 해당 사용자의 컬렉션 개수 가져오기
          const collectionsQuery = query(
            collection(db, "collections"),
            where("userId", "==", uid)
          );
          const collectionsSnapshot = await getDocs(collectionsQuery);
          collectionCount = collectionsSnapshot.size;
          console.log(
            `사용자 ${uid} (${userData.email})의 컬렉션 개수: ${collectionCount}`
          );
          if (collectionCount > 0) {
            console.log(
              `  - 컬렉션 문서 ID들:`,
              collectionsSnapshot.docs.map((d) => d.id)
            );
          }
        } catch (collectionError: unknown) {
          const error = collectionError as { code?: string; message?: string };
          console.error(`사용자 ${uid}의 컬렉션 로드 실패:`, {
            error: collectionError,
            code: error.code,
            message: error.message || String(collectionError),
          });
        }

        // 구독 정보 파싱
        let subscription = undefined;
        if (userData.subscription) {
          const subData = userData.subscription;
          subscription = {
            plan: subData.plan || "free",
            status: subData.status || "expired",
            billingCycle: subData.billingCycle || "monthly",
            startDate: subData.startDate?.toDate() || new Date(),
            endDate: subData.endDate?.toDate(),
            cancelAtPeriodEnd: subData.cancelAtPeriodEnd || false,
            subscriptionId: subData.subscriptionId,
            customerId: subData.customerId,
            trialEndDate: subData.trialEndDate?.toDate(),
          };
        }

        usersData.push({
          uid,
          email: userData.email || null,
          displayName: userData.displayName || null,
          createdAt: userData.createdAt?.toDate() || new Date(),
          bookmarkCount,
          collectionCount,
          lastLoginAt: userData.lastLoginAt?.toDate(),
          isActive: userData.isActive !== false, // 기본값은 true (기존 사용자 호환성)
          subscription,
        });
      }

      setUsers(usersData);
    } catch (err: unknown) {
      console.error("사용자 목록 로드 오류:", err);
      setError(
        err instanceof Error
          ? err.message
          : "사용자 목록을 불러오는데 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  // 사용자 비활성화/활성화 함수
  const toggleUserStatus = async (uid: string, isActive: boolean) => {
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        isActive,
        updatedAt: new Date(),
      });

      // 로컬 상태 업데이트
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === uid ? { ...user, isActive } : user
        )
      );

      console.log(
        `사용자 ${uid} 상태 변경: ${isActive ? "활성화" : "비활성화"}`
      );
    } catch (err: unknown) {
      console.error("사용자 상태 변경 실패:", err);
      setError(
        err instanceof Error ? err.message : "사용자 상태 변경에 실패했습니다."
      );
    }
  };

  return { users, loading, error, refetch: loadUsers, toggleUserStatus };
}
