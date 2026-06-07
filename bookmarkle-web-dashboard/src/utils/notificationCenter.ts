import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db, getUserNotificationSettings } from "../firebase";
import i18n from "../i18n";
import type { NotificationType } from "../types";

const isBookmarkNotificationsEnabled = async (userId: string) => {
  try {
    const settings = await getUserNotificationSettings(userId);
    if (settings.notifications !== undefined) return settings.notifications;
    if (settings.bookmarkNotifications !== undefined)
      return settings.bookmarkNotifications;
    return true;
  } catch {
    return true;
  }
};

const getLocalizedMessage = (
  type: NotificationType,
  title?: string,
  message?: string
) => {
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

export const createBookmarkNotification = async (
  userId: string,
  type: NotificationType,
  options: {
    title?: string;
    message?: string;
    bookmarkId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<string | null> => {
  if (!userId) return null;

  if (!(await isBookmarkNotificationsEnabled(userId))) return null;

  const { title, message } = getLocalizedMessage(
    type,
    options.title,
    options.message
  );

  try {
    const docRef = await addDoc(collection(db, "notifications"), {
      userId,
      type,
      title,
      message,
      isRead: false,
      createdAt: Timestamp.now(),
      bookmarkId: options.bookmarkId || null,
      metadata: options.metadata || null,
    });
    return docRef.id;
  } catch (error) {
    console.error("알림센터 항목 생성 실패:", error);
    return null;
  }
};
