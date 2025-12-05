/**
 * Firestore 통신 서비스
 * signInWithPopup.js에서 이관된 데이터베이스 조작 함수들
 */

import { deduplicator } from "./requestDeduplication";
import {
  db,
  auth,
} from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Bookmark, Collection } from "../types";

/**
 * Firestore에 컬렉션 생성
 */
export async function createCollection(collectionData: {
  userId: string;
  name: string;
  icon?: string;
  description?: string;
  parentId?: string;
}): Promise<string> {
  if (!collectionData.userId) {
    throw new Error("User ID is required");
  }

  try {
    const collectionsRef = collection(db, "collections");

    // 컬렉션 데이터 준비
    const newCollection: Record<string, unknown> = {
      userId: collectionData.userId,
      name: collectionData.name || "",
      icon: collectionData.icon || "📁",
      description: collectionData.description || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // parentId가 있으면 추가
    if (collectionData.parentId) {
      newCollection.parentId = collectionData.parentId;
    }

    // Firestore에 저장
    const docRef = await addDoc(collectionsRef, newCollection);

    return docRef.id;
  } catch (error) {
    console.error("Error creating collection:", error);
    throw error;
  }
}

/**
 * Firestore에서 컬렉션 가져오기 (내부 함수)
 */
async function fetchCollectionsInternal(userId: string): Promise<Collection[]> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const collectionsRef = collection(db, "collections");
    const q = query(collectionsRef, where("userId", "==", userId));

    const querySnapshot = await getDocs(q);
    const collections: Collection[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      collections.push({
        id: doc.id,
        userId: data.userId,
        name: data.name || "",
        icon: data.icon || "📁",
        description: data.description || "",
        parentId: data.parentId || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    // 클라이언트 측에서 이름순으로 정렬
    collections.sort((a, b) => a.name.localeCompare(b.name));

    return collections;
  } catch (error) {
    console.error("Error fetching collections:", error);
    throw error;
  }
}

/**
 * Firestore에서 컬렉션 가져오기 (중복 제거)
 */
export async function fetchCollections(userId: string): Promise<Collection[]> {
  return deduplicator.deduplicate(
    `collections:${userId}`,
    () => fetchCollectionsInternal(userId)
  );
}

/**
 * Firestore에서 북마크 가져오기
 */
export async function fetchBookmarks(
  userId: string,
  collectionId?: string | null
): Promise<Bookmark[]> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const bookmarksRef = collection(db, "bookmarks");
    let q;

    if (collectionId) {
      // 특정 컬렉션의 북마크만 가져오기
      q = query(
        bookmarksRef,
        where("userId", "==", userId),
        where("collection", "==", collectionId)
      );
    } else {
      // 모든 북마크 가져오기
      q = query(bookmarksRef, where("userId", "==", userId));
    }

    const querySnapshot = await getDocs(q);
    const bookmarks: Bookmark[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      bookmarks.push({
        id: doc.id,
        userId: data.userId,
        title: data.title || "",
        url: data.url || "",
        description: data.description || "",
        favicon: data.favicon || "",
        collection: data.collection || null,
        tags: data.tags || [],
        isFavorite: Boolean(data.isFavorite),
        order: data.order ?? 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        deletedAt: data.deletedAt?.toDate() || null,
      });
    });

    // 클라이언트 측에서 정렬
    bookmarks.sort((a, b) => (a.order || 0) - (b.order || 0));

    return bookmarks;
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    throw error;
  }
}

/**
 * Firebase에 알림 생성
 */
export async function createNotification(
  userId: string,
  type: string,
  message: string,
  bookmarkId?: string | null
): Promise<string | null> {
  console.log("🔔 createNotification called with:", {
    userId,
    type,
    message,
    bookmarkId,
  });

  if (!userId) {
    throw new Error("User ID is required for notification");
  }

  const isBookmarkNotification =
    type === "bookmark_added" ||
    type === "bookmark_updated" ||
    type === "bookmark_deleted";

  let notificationsEnabled = true;
  let bookmarkNotificationsEnabled = true;

  try {
    const settingsRef = doc(db, "users", userId, "settings", "main");
    const snap = await getDoc(settingsRef);

    if (snap.exists()) {
      const data = snap.data();
      notificationsEnabled =
        data.notifications !== undefined ? data.notifications : true;
      bookmarkNotificationsEnabled =
        data.bookmarkNotifications !== undefined
          ? data.bookmarkNotifications
          : notificationsEnabled;
    }
  } catch (error) {
    console.error("🔔 알림 설정 확인 실패:", error);
  }

  if (!notificationsEnabled) {
    console.log(
      "🔔 전체 알림이 비활성화되어 있어 알림을 생성하지 않습니다."
    );
    return null;
  }

  if (isBookmarkNotification && !bookmarkNotificationsEnabled) {
    console.log("🔔 북마크 알림이 비활성화되어 있어 알림을 생성하지 않습니다.");
    return null;
  }

  try {
    console.log("🔔 Creating notification in Firestore...");
    console.log("🔔 Firebase auth state:", {
      currentUser: auth.currentUser?.uid,
      isAuthenticated: !!auth.currentUser,
      email: auth.currentUser?.email,
    });

    const notificationsRef = collection(db, "notifications");

    const notificationData = {
      userId: userId,
      type: type,
      title: "북마크 알림",
      message: message,
      isRead: false,
      createdAt: serverTimestamp(),
      bookmarkId: bookmarkId || null,
      metadata: {
        source: "web-dashboard",
        timestamp: new Date().toISOString(),
      },
    };

    console.log("🔔 Notification data prepared:", notificationData);
    console.log(
      "🔔 Attempting to add document to notifications collection..."
    );

    const docRef = await addDoc(notificationsRef, notificationData);
    console.log("🔔 Notification created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("🔔 Error creating notification:", error);
    console.error("🔔 Error details:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
}

/**
 * 북마크 저장 (북마크 추가/업데이트 시 사용)
 * 주의: 실제 북마크 추가/업데이트는 bookmarkStore에서 처리합니다
 * 이 함수는 확장 프로그램이나 외부 소스의 북마크를 처리할 때 사용합니다
 */
export async function saveBookmarkDirect(bookmarkData: {
  userId: string;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  collectionId?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  order?: number;
}): Promise<string> {
  if (!bookmarkData.userId) {
    throw new Error("User ID is required");
  }

  try {
    const bookmarksRef = collection(db, "bookmarks");

    // 컬렉션 ID 처리
    let collectionId = null;
    const rawCollectionId =
      bookmarkData.collectionId || bookmarkData.collectionId;

    if (rawCollectionId && typeof rawCollectionId === "string" && rawCollectionId.trim() !== "") {
      collectionId = rawCollectionId.trim();
    }

    const newBookmark = {
      userId: bookmarkData.userId,
      title: bookmarkData.title || "",
      url: bookmarkData.url || "",
      description: bookmarkData.description || "",
      collection: collectionId,
      tags: bookmarkData.tags || [],
      favicon: bookmarkData.favicon || "",
      isFavorite: bookmarkData.isFavorite || false,
      order: bookmarkData.order ?? 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("저장할 북마크 데이터:", {
      ...newBookmark,
      createdAt: "serverTimestamp()",
      updatedAt: "serverTimestamp()",
    });
    console.log("컬렉션 ID 최종 확인:", collectionId);

    // Firestore에 저장
    const docRef = await addDoc(bookmarksRef, newBookmark);

    try {
      await createNotification(
        bookmarkData.userId,
        "bookmark_added",
        `"${bookmarkData.title}" 북마크가 추가되었습니다`,
        docRef.id
      );
    } catch (notificationError) {
      // 알림 생성 실패해도 북마크 저장은 성공으로 처리
      console.error("Failed to create notification:", notificationError);
    }

    return docRef.id;
  } catch (error) {
    console.error("Error saving bookmark:", error);
    throw error;
  }
}

/**
 * 사용자의 알림 설정 가져오기
 */
export async function getUserNotificationSettings(
  uid: string
): Promise<{
  notifications: boolean;
  systemNotifications: boolean;
  bookmarkNotifications: boolean;
}> {
  if (!uid) {
    throw new Error("User ID is required");
  }

  try {
    const settingsRef = doc(db, "users", uid, "settings", "main");
    const snap = await getDoc(settingsRef);

    let notificationsEnabled = true;
    let systemNotificationsEnabled = true;
    let bookmarkNotifications = true;

    if (snap.exists()) {
      const data = snap.data();
      notificationsEnabled =
        data.notifications !== undefined ? data.notifications : true;
      systemNotificationsEnabled =
        data.systemNotifications !== undefined
          ? data.systemNotifications
          : notificationsEnabled;
      bookmarkNotifications =
        data.bookmarkNotifications !== undefined
          ? data.bookmarkNotifications
          : notificationsEnabled;
    }

    return {
      notifications: notificationsEnabled,
      systemNotifications: systemNotificationsEnabled,
      bookmarkNotifications: bookmarkNotifications,
    };
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    throw error;
  }
}
