import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db, getUserNotificationSettings } from "../firebase";
import type { Notification, NotificationType } from "../types";
import i18n from "../i18n";

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
        console.error("알림 로딩 오류:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // 알림 생성 (다국어 지원)
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

    // 북마크 관련 알림인 경우 설정 확인
    const isBookmarkNotification =
      type === "bookmark_added" ||
      type === "bookmark_updated" ||
      type === "bookmark_deleted";

    if (isBookmarkNotification) {
      try {
        const settings = await getUserNotificationSettings(userId);

        // bookmarkNotifications가 명시적으로 false인 경우에만 알림 생성하지 않음
        // undefined나 true인 경우에는 알림 생성 (기본값은 활성화)
        if (settings.bookmarkNotifications === false) {
          return null;
        }
      } catch (error) {
        // 설정 확인 실패 시 기본값(활성화)으로 처리하여 알림 생성 계속 진행
      }
    }

    try {
      // 다국어 메시지 생성
      const getLocalizedMessage = (type: NotificationType) => {
        const t = i18n.t;
        switch (type) {
          case "bookmark_added":
            return {
              title: title || t("notifications.types.bookmarkAdded"),
              message: message || t("notifications.messages.bookmarkAdded"),
            };
          case "bookmark_updated":
            return {
              title: title || t("notifications.types.bookmarkUpdated"),
              message: message || t("notifications.messages.bookmarkUpdated"),
            };
          case "bookmark_deleted":
            return {
              title: title || t("notifications.types.bookmarkDeleted"),
              message: message || t("notifications.messages.bookmarkDeleted"),
            };
          case "system":
            return {
              title: title || t("notifications.types.system"),
              message: message || t("notifications.messages.systemUpdate"),
            };
          default:
            return {
              title: title || t("notifications.title"),
              message: message || "",
            };
        }
      };

      const localizedMessage = getLocalizedMessage(type);

      const notificationData = {
        userId,
        type,
        title: localizedMessage.title,
        message: localizedMessage.message,
        isRead: false,
        createdAt: Timestamp.now(),
        bookmarkId: bookmarkId || null,
        metadata: metadata || null,
      };

      const docRef = await addDoc(
        collection(db, "notifications"),
        notificationData
      );

      return docRef.id;
    } catch (error) {
      console.error("알림 생성 실패:", error);
      throw error;
    }
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
