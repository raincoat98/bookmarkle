import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { Notification, NotificationType } from "../../types";
import { createBookmarkNotification } from "../../utils/notificationCenter";

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // 알림 목록 조회
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
      // orderBy는 복합 인덱스가 필요하므로 클라이언트에서 정렬
      // orderBy("createdAt", "desc"),
      // limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const notificationList: Notification[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          notificationList.push({
            id: doc.id,
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            isRead: data.isRead || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            bookmarkId: data.bookmarkId,
            metadata: data.metadata,
          });
        });

        // 클라이언트에서 최신순으로 정렬
        const sortedNotifications = notificationList
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 50); // 최대 50개만 표시

        setNotifications(sortedNotifications);
        setUnreadCount(sortedNotifications.filter((n) => !n.isRead).length);
        setLoading(false);
      },
      (error) => {
        const err = error as { code?: string; message?: string };
        // 권한 오류 시 리스너 자동 정리
        if (
          err?.code === "permission-denied" ||
          err?.code === "unauthenticated"
        ) {
          // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
          try {
            unsubscribe();
          } catch {
            // 리스너 정리 중 발생하는 에러는 무시
          }
          setNotifications([]);
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        if (import.meta.env.DEV) {
          console.error("알림 로딩 오류:", error);
        }
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // 알림 생성 (notificationCenter 유틸 래퍼)
  const createNotification = async (
    type: NotificationType,
    title?: string,
    message?: string,
    bookmarkId?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!userId) {
      console.error("알림 생성 실패: userId가 없습니다.");
      throw new Error("사용자가 로그인되지 않았습니다.");
    }
    return createBookmarkNotification(userId, type, {
      title,
      message,
      bookmarkId,
      metadata,
    });
  };

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
    });
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    if (!userId) return;

    const batch = notifications
      .filter((n) => !n.isRead)
      .map((n) => {
        const notificationRef = doc(db, "notifications", n.id);
        return updateDoc(notificationRef, { isRead: true });
      });

    await Promise.all(batch);
  };

  // 알림 삭제
  const deleteNotification = async (notificationId: string) => {
    await deleteDoc(doc(db, "notifications", notificationId));
  };

  // 모든 읽음 알림 삭제
  const deleteReadNotifications = async () => {
    if (!userId) return;

    const readNotifications = notifications.filter((n) => n.isRead);
    const batch = readNotifications.map((n) =>
      deleteDoc(doc(db, "notifications", n.id))
    );

    await Promise.all(batch);
  };

  // 모든 알림 삭제
  const deleteAllNotifications = async () => {
    if (!userId) return;

    const batch = notifications.map((n) =>
      deleteDoc(doc(db, "notifications", n.id))
    );

    await Promise.all(batch);
  };

  return {
    notifications,
    loading,
    unreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    deleteAllNotifications,
  };
};
