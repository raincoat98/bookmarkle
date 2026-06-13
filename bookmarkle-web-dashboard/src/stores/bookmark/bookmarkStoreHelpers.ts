import {
  collection,
  doc,
  query,
  where,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { Bookmark } from "../../types";
import {
  showBookmarkNotification,
  getNotificationPermission,
} from "../../utils/browserNotifications";
import { createBookmarkNotification } from "../../utils/notificationCenter";

const LOCAL_ADD_TTL_MS = 30_000;
const recentLocalAddIds = new Map<string, number>();

const isSystemNotificationEnabled = () => {
  const saved = localStorage.getItem("systemNotifications");
  if (saved !== null) return JSON.parse(saved);
  const fallback = localStorage.getItem("notifications");
  if (fallback !== null) return JSON.parse(fallback);
  return true;
};

export const shouldEmitSystemNotification = () => {
  if (!getNotificationPermission().granted) return false;
  return isSystemNotificationEnabled();
};

export const markLocalAdd = (id: string) => {
  recentLocalAddIds.set(id, Date.now());
};

export const consumeLocalAdd = (id: string): boolean => {
  const ts = recentLocalAddIds.get(id);
  if (ts === undefined) return false;
  recentLocalAddIds.delete(id);
  return Date.now() - ts <= LOCAL_ADD_TTL_MS;
};

export const sweepRecentLocalAdds = () => {
  const now = Date.now();
  for (const [id, ts] of recentLocalAddIds) {
    if (now - ts > LOCAL_ADD_TTL_MS) recentLocalAddIds.delete(id);
  }
};

export const bookmarksCollection = () => collection(db, "bookmarks");

export const bookmarkDocRef = (bookmarkId: string) =>
  doc(db, "bookmarks", bookmarkId);

export const createUserBookmarksQuery = (userId: string) =>
  query(bookmarksCollection(), where("userId", "==", userId));

export const convertSnapshotToBookmark = (
  docSnapshot: DocumentSnapshot
): Bookmark | null => {
  const data = docSnapshot.data();
  if (!data) return null;

  const deletedAt = data.deletedAt?.toDate() ?? null;
  const createdAt = data.createdAt?.toDate() ?? new Date();
  const updatedAt = data.updatedAt?.toDate() ?? new Date();

  return {
    id: docSnapshot.id,
    title: data.title || "",
    url: data.url || "",
    description: data.description || "",
    favicon: data.favicon || "",
    collection: data.collection || null,
    order: data.order ?? 0,
    userId: data.userId || "",
    createdAt,
    updatedAt,
    tags: data.tags || [],
    isFavorite: Boolean(data.isFavorite),
    deletedAt,
  };
};

export const getActiveBookmarks = (
  snapshots: DocumentSnapshot[]
): Bookmark[] =>
  snapshots.reduce<Bookmark[]>((bookmarks, docSnapshot) => {
    const bookmark = convertSnapshotToBookmark(docSnapshot);
    if (bookmark && !bookmark.deletedAt) {
      bookmarks.push({ ...bookmark, deletedAt: null });
    }
    return bookmarks;
  }, []);

const sortTrashBookmarks = (bookmarks: Bookmark[]): Bookmark[] =>
  [...bookmarks].sort((a, b) => {
    if (!a.deletedAt || !b.deletedAt) return 0;
    return b.deletedAt.getTime() - a.deletedAt.getTime();
  });

export const getTrashBookmarks = (
  snapshots: DocumentSnapshot[]
): Bookmark[] =>
  sortTrashBookmarks(
    snapshots.reduce<Bookmark[]>((bookmarks, docSnapshot) => {
      const bookmark = convertSnapshotToBookmark(docSnapshot);
      if (bookmark?.deletedAt) bookmarks.push(bookmark);
      return bookmarks;
    }, [])
  );

export const isIndexBuildingError = (error: unknown): boolean => {
  const err = error as { code?: string; message?: string };
  return (
    err?.code === "failed-precondition" &&
    Boolean(err?.message?.includes("index is currently building"))
  );
};

export const isPermissionOrAuthError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string };
  return err.code === "permission-denied" || err.code === "unauthenticated";
};

export const createAddedBookmarkNotification = (
  userId: string,
  bookmarkId: string,
  title: string
) => {
  createBookmarkNotification(userId, "bookmark_added", {
    bookmarkId,
    message: `"${title}" 북마크가 추가되었습니다`,
  });
};

export const createSystemBookmarkAddedNotification = (
  bookmarkId: string,
  title: string
) => {
  showBookmarkNotification("added", title, { bookmarkId });
};

export const unsubscribeSilently = (unsubscribe: () => void) => {
  try {
    unsubscribe();
  } catch {
    return;
  }
};

export const trackUnsubscribe = (
  unsubscribe: () => void,
  getListeners: () => (() => void)[],
  setListeners: (listeners: (() => void)[]) => void
) => {
  const wrappedUnsubscribe = () => {
    unsubscribe();
    setListeners(
      getListeners().filter((listener) => listener !== wrappedUnsubscribe)
    );
  };

  setListeners([...getListeners(), wrappedUnsubscribe]);
  return wrappedUnsubscribe;
};
