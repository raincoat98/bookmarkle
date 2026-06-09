import {
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Bookmark, BookmarkFormData } from "../types";
import { getFaviconUrl, refreshFavicon } from "../utils/favicon";
import { createBookmarkNotification } from "../utils/notificationCenter";
import type {
  BookmarkActions,
  BookmarkStoreGet,
  BookmarkStoreSet,
} from "./bookmarkStoreTypes";
import {
  bookmarkDocRef,
  bookmarksCollection,
  convertSnapshotToBookmark,
  createAddedBookmarkNotification,
  isIndexBuildingError,
  markLocalAdd,
} from "./bookmarkStoreHelpers";

type BookmarkMutationActions = Pick<
  BookmarkActions,
  | "addBookmark"
  | "updateBookmark"
  | "deleteBookmark"
  | "restoreBookmark"
  | "permanentlyDeleteBookmark"
  | "emptyTrash"
  | "cleanupOldTrash"
  | "reorderBookmarks"
  | "moveBookmarkToCollection"
  | "toggleFavorite"
  | "updateBookmarkFavicon"
>;

const requireUserId = (userId: string) => {
  if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");
};

const normalizeBookmarkUrl = (url: string) => {
  const trimmedUrl = url.trim();
  new URL(trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`);
  return trimmedUrl;
};

const createBookmarkPayload = (
  bookmarkData: BookmarkFormData,
  userId: string,
  order: number
) => {
  const trimmedTitle = bookmarkData.title?.trim();
  const trimmedUrl = bookmarkData.url?.trim();

  if (!trimmedTitle) throw new Error("북마크 제목은 필수입니다.");
  if (!trimmedUrl) throw new Error("북마크 URL은 필수입니다.");

  try {
    normalizeBookmarkUrl(trimmedUrl);
  } catch {
    throw new Error("올바른 URL 형식이 아닙니다.");
  }

  const favicon = bookmarkData.favicon || getFaviconUrl(trimmedUrl) || "";
  const now = new Date();

  return {
    payload: {
      title: trimmedTitle,
      url: trimmedUrl,
      description: bookmarkData.description || "",
      favicon,
      collection: bookmarkData.collection || null,
      order: bookmarkData.order ?? order,
      userId,
      createdAt: now,
      updatedAt: now,
      tags: Array.isArray(bookmarkData.tags) ? bookmarkData.tags : [],
      isFavorite: Boolean(bookmarkData.isFavorite),
    },
    title: trimmedTitle,
  };
};

const removeTrashBookmark = (set: BookmarkStoreSet, bookmarkId: string) => {
  set((state) => ({
    trashBookmarks: state.trashBookmarks.filter(
      (bookmark) => bookmark.id !== bookmarkId
    ),
  }));
};

export const createBookmarkMutations = (
  set: BookmarkStoreSet,
  get: BookmarkStoreGet
): BookmarkMutationActions => ({
  addBookmark: async (bookmarkData: BookmarkFormData, userId: string) => {
    const { rawBookmarks } = get();
    requireUserId(userId);

    const { payload, title } = createBookmarkPayload(
      bookmarkData,
      userId,
      rawBookmarks.length
    );
    const docRef = await addDoc(bookmarksCollection(), payload);

    markLocalAdd(docRef.id);
    createAddedBookmarkNotification(userId, docRef.id, title);

    return docRef.id;
  },

  updateBookmark: async (
    bookmarkId: string,
    bookmarkData: BookmarkFormData,
    userId: string
  ) => {
    requireUserId(userId);

    const favicon =
      bookmarkData.favicon ||
      (bookmarkData.url ? getFaviconUrl(bookmarkData.url) : "") ||
      "";

    await updateDoc(bookmarkDocRef(bookmarkId), {
      title: bookmarkData.title,
      url: bookmarkData.url,
      description: bookmarkData.description || "",
      favicon,
      collection: bookmarkData.collection || null,
      updatedAt: new Date(),
      tags: bookmarkData.tags || [],
      isFavorite: Boolean(bookmarkData.isFavorite),
    });

    createBookmarkNotification(userId, "bookmark_updated", {
      bookmarkId,
      message: `"${bookmarkData.title}" 북마크가 수정되었습니다`,
    });
  },

  deleteBookmark: async (bookmarkId: string) => {
    const { rawBookmarks } = get();
    const bookmarkToDelete = rawBookmarks.find((b) => b.id === bookmarkId);
    const now = Timestamp.now();

    await updateDoc(bookmarkDocRef(bookmarkId), {
      deletedAt: now,
      updatedAt: now,
    });

    if (bookmarkToDelete?.userId) {
      createBookmarkNotification(bookmarkToDelete.userId, "bookmark_deleted", {
        bookmarkId,
        message: `"${bookmarkToDelete.title}" 북마크가 삭제되었습니다`,
      });
    }
  },

  restoreBookmark: async (bookmarkId: string) => {
    await updateDoc(bookmarkDocRef(bookmarkId), {
      deletedAt: null,
      updatedAt: Timestamp.now(),
    });
    removeTrashBookmark(set, bookmarkId);
  },

  permanentlyDeleteBookmark: async (bookmarkId: string) => {
    await deleteDoc(bookmarkDocRef(bookmarkId));
    removeTrashBookmark(set, bookmarkId);
  },

  emptyTrash: async (userId: string) => {
    requireUserId(userId);

    const { trashBookmarks } = get();
    if (!trashBookmarks.length) {
      set({ trashBookmarks: [], trashLoading: false });
      return;
    }

    const batch = writeBatch(db);
    trashBookmarks.forEach((bookmark) => {
      batch.delete(bookmarkDocRef(bookmark.id));
    });

    await batch.commit();
    set({ trashBookmarks: [], trashLoading: false });
  },

  cleanupOldTrash: async (userId: string) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const q = query(
      bookmarksCollection(),
      where("userId", "==", userId),
      where("deletedAt", "!=", null)
    );

    return new Promise<void>((resolve, reject) => {
      const unsubscribe = onSnapshot(
        q,
        async (querySnapshot) => {
          const batch = writeBatch(db);
          let deletedCount = 0;

          querySnapshot.forEach((docSnapshot) => {
            const bookmark = convertSnapshotToBookmark(docSnapshot);
            const deletedAt = bookmark?.deletedAt;

            if (deletedAt && deletedAt < thirtyDaysAgo) {
              batch.delete(bookmarkDocRef(docSnapshot.id));
              deletedCount++;
            }
          });

          if (deletedCount > 0) {
            try {
              await batch.commit();
              console.log(`${deletedCount}개의 오래된 휴지통 항목이 삭제되었습니다.`);
            } catch (error) {
              console.error("휴지통 정리 오류:", error);
              unsubscribe();
              reject(error);
              return;
            }
          }

          unsubscribe();
          resolve();
        },
        (error: unknown) => {
          if (isIndexBuildingError(error)) {
            console.log(
              "휴지통 정리: 인덱스가 아직 빌드 중입니다. 나중에 다시 시도됩니다."
            );
            unsubscribe();
            resolve();
            return;
          }
          console.error("휴지통 정리 오류:", error);
          unsubscribe();
          reject(error);
        }
      );
    });
  },

  reorderBookmarks: async (newBookmarks: Bookmark[], userId: string) => {
    if (!userId) return;

    const batch = writeBatch(db);
    newBookmarks.forEach((bookmark, index) => {
      batch.update(bookmarkDocRef(bookmark.id), { order: index });
    });

    await batch.commit();

    set((state) => {
      const updated = [...state.rawBookmarks];
      newBookmarks.forEach((bookmark, index) => {
        const existingIndex = updated.findIndex((b) => b.id === bookmark.id);
        if (existingIndex !== -1) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            order: index,
          };
        }
      });
      return { rawBookmarks: updated };
    });
  },

  moveBookmarkToCollection: async (
    bookmarkId: string,
    newCollection: string | null,
    allBookmarksNewOrder: Bookmark[]
  ) => {
    const batch = writeBatch(db);

    batch.update(bookmarkDocRef(bookmarkId), {
      collection: newCollection,
      order: allBookmarksNewOrder.findIndex((b) => b.id === bookmarkId),
      updatedAt: new Date(),
    });

    allBookmarksNewOrder.forEach((bookmark, index) => {
      if (bookmark.id !== bookmarkId) {
        batch.update(bookmarkDocRef(bookmark.id), { order: index });
      }
    });

    await batch.commit();

    set((state) => ({
      rawBookmarks: state.rawBookmarks.map((b) => {
        const newIndex = allBookmarksNewOrder.findIndex((bm) => bm.id === b.id);
        if (b.id === bookmarkId) return { ...b, collection: newCollection, order: newIndex };
        if (newIndex !== -1) return { ...b, order: newIndex };
        return b;
      }),
    }));
  },

  toggleFavorite: async (
    bookmarkId: string,
    isFavorite: boolean,
    userId: string
  ) => {
    requireUserId(userId);

    await updateDoc(bookmarkDocRef(bookmarkId), {
      isFavorite,
      updatedAt: new Date(),
    });
  },

  updateBookmarkFavicon: async (
    bookmarkId: string,
    url: string,
    userId: string
  ) => {
    requireUserId(userId);

    const newFavicon = await refreshFavicon(url);
    await updateDoc(bookmarkDocRef(bookmarkId), {
      favicon: newFavicon,
      updatedAt: new Date(),
    });
    return newFavicon;
  },
});
