import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Bookmark, BookmarkFormData, Collection } from "../types";
import { getFaviconUrl, refreshFavicon } from "../utils/favicon";
import {
  showBookmarkNotification,
  getNotificationPermission,
} from "../utils/browserNotifications";
import { createBookmarkNotification } from "../utils/notificationCenter";

const isSystemNotificationEnabled = () => {
  const saved = localStorage.getItem("systemNotifications");
  if (saved !== null) return JSON.parse(saved);
  const fallback = localStorage.getItem("notifications");
  if (fallback !== null) return JSON.parse(fallback);
  return true;
};

const shouldEmitSystemNotification = () => {
  if (!getNotificationPermission().granted) return false;
  return isSystemNotificationEnabled();
};

// 본인이 이 창에서 막 추가한 북마크 ID — onSnapshot의 added 이벤트와 매칭되면
// 외부 추가가 아니라고 판단해서 시스템 알림을 띄우지 않는다.
const LOCAL_ADD_TTL_MS = 30_000;
const recentLocalAddIds = new Map<string, number>();

const markLocalAdd = (id: string) => {
  recentLocalAddIds.set(id, Date.now());
};

const consumeLocalAdd = (id: string): boolean => {
  const ts = recentLocalAddIds.get(id);
  if (ts === undefined) return false;
  recentLocalAddIds.delete(id);
  return Date.now() - ts <= LOCAL_ADD_TTL_MS;
};

const sweepRecentLocalAdds = () => {
  const now = Date.now();
  for (const [id, ts] of recentLocalAddIds) {
    if (now - ts > LOCAL_ADD_TTL_MS) recentLocalAddIds.delete(id);
  }
};

const convertSnapshotToBookmark = (
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

const isIndexBuildingError = (error: unknown): boolean => {
  const err = error as { code?: string; message?: string };
  return (
    err?.code === "failed-precondition" &&
    Boolean(err?.message?.includes("index is currently building"))
  );
};

interface BookmarkState {
  rawBookmarks: Bookmark[];
  trashBookmarks: Bookmark[];
  loading: boolean;
  trashLoading: boolean;
  selectedCollection: string;
  collections: Collection[];
}

interface BookmarkActions {
  setRawBookmarks: (bookmarks: Bookmark[]) => void;
  setLoading: (loading: boolean) => void;
  setSelectedCollection: (collection: string) => void;
  setCollections: (collections: Collection[]) => void;
  getChildCollectionIds: (parentId: string) => string[];
  getFilteredBookmarks: () => Bookmark[];
  subscribeToBookmarks: (userId: string) => () => void;
  subscribeToTrash: (userId: string) => () => void;
  cleanupAllListeners: () => void;
  migrateFavicons: (userId: string) => Promise<void>;
  migrateIsFavorite: (userId: string) => Promise<void>;
  addBookmark: (
    bookmarkData: BookmarkFormData,
    userId: string
  ) => Promise<string>;
  updateBookmark: (
    bookmarkId: string,
    bookmarkData: BookmarkFormData,
    userId: string
  ) => Promise<void>;
  deleteBookmark: (bookmarkId: string) => Promise<void>;
  restoreBookmark: (bookmarkId: string) => Promise<void>;
  permanentlyDeleteBookmark: (bookmarkId: string) => Promise<void>;
  emptyTrash: (userId: string) => Promise<void>;
  cleanupOldTrash: (userId: string) => Promise<void>;
  reorderBookmarks: (newBookmarks: Bookmark[], userId: string) => Promise<void>;
  toggleFavorite: (
    bookmarkId: string,
    isFavorite: boolean,
    userId: string
  ) => Promise<void>;
  updateBookmarkFavicon: (
    bookmarkId: string,
    url: string,
    userId: string
  ) => Promise<string>;
}

// 활성 리스너 추적
let activeBookmarkListeners: (() => void)[] = [];
let activeTrashListeners: (() => void)[] = [];

// Date 객체를 sessionStorage에 저장/복원하는 커스텀 storage
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const dateAwareStorage = createJSONStorage(() => sessionStorage, {
  reviver: (_key, value) => {
    if (typeof value === "string" && ISO_DATE_RE.test(value)) {
      return new Date(value);
    }
    return value;
  },
});


export const useBookmarkStore = create<BookmarkState & BookmarkActions>()(
  persist(
  (set, get) => ({
    rawBookmarks: [],
    trashBookmarks: [],
    loading: true,
    trashLoading: true,
    selectedCollection: "all",
    collections: [],

    // Actions
    setRawBookmarks: (bookmarks) => set({ rawBookmarks: bookmarks }),
    setLoading: (loading) => set({ loading }),
    setSelectedCollection: (collection) =>
      set({ selectedCollection: collection }),
    setCollections: (collections) => set({ collections }),

    getChildCollectionIds: (parentId: string): string[] => {
      const { collections } = get();
      const childIds: string[] = [];
      const getChildren = (id: string) => {
        const children = collections.filter((col) => col.parentId === id);
        children.forEach((child) => {
          childIds.push(child.id);
          getChildren(child.id);
        });
      };
      getChildren(parentId);
      return childIds;
    },

    getFilteredBookmarks: (): Bookmark[] => {
      const { rawBookmarks, selectedCollection, getChildCollectionIds } = get();

      let filtered: Bookmark[];
      if (selectedCollection === "favorites") {
        filtered = rawBookmarks.filter((bookmark) => bookmark.isFavorite);
      } else if (selectedCollection === "none") {
        filtered = rawBookmarks.filter(
          (bookmark) => !bookmark.collection || bookmark.collection === ""
        );
      } else if (selectedCollection === "all") {
        filtered = rawBookmarks;
      } else {
        const childCollectionIds = getChildCollectionIds(selectedCollection);
        const targetCollectionIds = [selectedCollection, ...childCollectionIds];
        filtered = rawBookmarks.filter(
          (bookmark) =>
            bookmark.collection &&
            targetCollectionIds.includes(String(bookmark.collection))
        );
      }

      return [...filtered].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    },

    subscribeToBookmarks: (userId: string) => {

      const q = query(
        collection(db, "bookmarks"),
        where("userId", "==", userId)
      );

      let isFirstSnapshot = true;

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const bookmarkList: Bookmark[] = [];

          querySnapshot.forEach((docSnapshot) => {
            const bookmark = convertSnapshotToBookmark(docSnapshot);
            if (bookmark && !bookmark.deletedAt) {
              bookmarkList.push({ ...bookmark, deletedAt: null });
            }
          });

          // fromCache: 캐시 응답이든 서버 응답이든 데이터가 있으면 로딩 해제
          set({ rawBookmarks: bookmarkList, loading: false });

          // 초기 스냅샷은 기존 데이터 로드이므로 알림을 띄우지 않는다.
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            sweepRecentLocalAdds();
            return;
          }

          // 외부(다른 창/기기/확장)에서 새로 추가된 북마크만 시스템 알림 + 알림센터.
          const emitSystem = shouldEmitSystemNotification();
          querySnapshot.docChanges().forEach((change) => {
            if (change.type !== "added") return;
            const bookmark = convertSnapshotToBookmark(change.doc);
            if (!bookmark || bookmark.deletedAt) return;
            if (consumeLocalAdd(change.doc.id)) return;

            if (emitSystem) {
              showBookmarkNotification("added", bookmark.title, {
                bookmarkId: change.doc.id,
              });
            }
            createBookmarkNotification(userId, "bookmark_added", {
              bookmarkId: change.doc.id,
              message: `"${bookmark.title}" 북마크가 추가되었습니다`,
            });
          });

          sweepRecentLocalAdds();
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
            // cleanupAllListeners에서 정리됨
          } else {
            console.error("북마크 로딩 오류:", error);
          }
          set({ loading: false });
        }
      );

      // 래핑된 unsubscribe 함수: 배열에서도 제거
      const wrappedUnsubscribe = () => {
        unsubscribe();
        activeBookmarkListeners = activeBookmarkListeners.filter(
          (listener) => listener !== wrappedUnsubscribe
        );
      };

      activeBookmarkListeners.push(wrappedUnsubscribe);
      return wrappedUnsubscribe;
    },

    subscribeToTrash: (userId: string) => {
      const q = query(
        collection(db, "bookmarks"),
        where("userId", "==", userId)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const trashList: Bookmark[] = [];

          querySnapshot.forEach((docSnapshot) => {
            const bookmark = convertSnapshotToBookmark(docSnapshot);
            if (bookmark?.deletedAt) {
              trashList.push(bookmark);
            }
          });

          trashList.sort((a, b) => {
            if (!a.deletedAt || !b.deletedAt) return 0;
            return b.deletedAt.getTime() - a.deletedAt.getTime();
          });

          set({ trashBookmarks: trashList, trashLoading: false });
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
            // cleanupAllListeners에서 정리됨
          } else {
            console.error("휴지통 로딩 오류:", error);
          }
          set({ trashLoading: false });
        }
      );

      // 래핑된 unsubscribe 함수: 배열에서도 제거
      const wrappedUnsubscribe = () => {
        unsubscribe();
        activeTrashListeners = activeTrashListeners.filter(
          (listener) => listener !== wrappedUnsubscribe
        );
      };

      activeTrashListeners.push(wrappedUnsubscribe);
      return wrappedUnsubscribe;
    },

    cleanupAllListeners: () => {
      if (process.env.NODE_ENV === "development") {
        console.log("🧹 북마크 리스너 정리 중...");
      }
      activeBookmarkListeners.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn("북마크 리스너 정리 중 오류:", error);
          }
        }
      });
      activeTrashListeners.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn("휴지통 리스너 정리 중 오류:", error);
          }
        }
      });
      activeBookmarkListeners = [];
      activeTrashListeners = [];
      // 로그아웃 시 캐시 초기화 (다른 계정 데이터 노출 방지)
      sessionStorage.removeItem("bookmarkle-cache");
      set({ rawBookmarks: [], collections: [], loading: true });
      if (process.env.NODE_ENV === "development") {
        console.log("✅ 북마크 리스너 정리 완료");
      }
    },

    migrateFavicons: async (userId: string) => {
      if (!userId) return;

      const { rawBookmarks } = get();
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const bookmark of rawBookmarks) {
        if (!bookmark.favicon && bookmark.url) {
          try {
            const faviconUrl = getFaviconUrl(bookmark.url);
            const bookmarkRef = doc(db, "bookmarks", bookmark.id);
            batch.update(bookmarkRef, { favicon: faviconUrl });
            updatedCount++;
          } catch (error) {
            console.error(
              `북마크 ${bookmark.id}의 파비콘 마이그레이션 실패:`,
              error
            );
          }
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        console.log(
          `${updatedCount}개의 북마크 파비콘이 마이그레이션되었습니다.`
        );
      }
    },

    migrateIsFavorite: async (userId: string) => {
      if (!userId) return;

      const { rawBookmarks } = get();
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const bookmark of rawBookmarks) {
        if (bookmark.isFavorite === undefined) {
          try {
            const bookmarkRef = doc(db, "bookmarks", bookmark.id);
            batch.update(bookmarkRef, { isFavorite: false });
            updatedCount++;
          } catch (error) {
            console.error(
              `북마크 ${bookmark.id}의 isFavorite 마이그레이션 실패:`,
              error
            );
          }
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        console.log(
          `${updatedCount}개의 북마크 isFavorite 필드가 마이그레이션되었습니다.`
        );
      }
    },

    addBookmark: async (bookmarkData: BookmarkFormData, userId: string) => {
      const { rawBookmarks } = get();
      if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");

      const trimmedTitle = bookmarkData.title?.trim();
      const trimmedUrl = bookmarkData.url?.trim();

      if (!trimmedTitle) {
        throw new Error("북마크 제목은 필수입니다.");
      }

      if (!trimmedUrl) {
        throw new Error("북마크 URL은 필수입니다.");
      }

      try {
        new URL(
          trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`
        );
      } catch {
        throw new Error("올바른 URL 형식이 아닙니다.");
      }

      const favicon = bookmarkData.favicon || getFaviconUrl(trimmedUrl) || "";
      const now = new Date();

      const newBookmark = {
        title: trimmedTitle,
        url: trimmedUrl,
        description: bookmarkData.description || "",
        favicon,
        collection: bookmarkData.collection || null,
        order: bookmarkData.order ?? rawBookmarks.length,
        userId,
        createdAt: now,
        updatedAt: now,
        tags: Array.isArray(bookmarkData.tags) ? bookmarkData.tags : [],
        isFavorite: Boolean(bookmarkData.isFavorite),
      };

      const docRef = await addDoc(collection(db, "bookmarks"), newBookmark);

      markLocalAdd(docRef.id);
      createBookmarkNotification(userId, "bookmark_added", {
        bookmarkId: docRef.id,
        message: `"${trimmedTitle}" 북마크가 추가되었습니다`,
      });

      return docRef.id;
    },

    updateBookmark: async (
      bookmarkId: string,
      bookmarkData: BookmarkFormData,
      userId: string
    ) => {
      if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");

      const favicon =
        bookmarkData.favicon ||
        (bookmarkData.url ? getFaviconUrl(bookmarkData.url) : "") ||
        "";

      const bookmarkRef = doc(db, "bookmarks", bookmarkId);
      await updateDoc(bookmarkRef, {
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

      const bookmarkRef = doc(db, "bookmarks", bookmarkId);
      await updateDoc(bookmarkRef, {
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
      const bookmarkRef = doc(db, "bookmarks", bookmarkId);
      await updateDoc(bookmarkRef, {
        deletedAt: null,
        updatedAt: Timestamp.now(),
      });

      set((state) => ({
        trashBookmarks: state.trashBookmarks.filter(
          (bookmark) => bookmark.id !== bookmarkId
        ),
      }));
    },

    permanentlyDeleteBookmark: async (bookmarkId: string) => {
      await deleteDoc(doc(db, "bookmarks", bookmarkId));

      set((state) => ({
        trashBookmarks: state.trashBookmarks.filter(
          (bookmark) => bookmark.id !== bookmarkId
        ),
      }));
    },

    emptyTrash: async (userId: string) => {
      if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");

      const { trashBookmarks } = get();
      if (!trashBookmarks.length) {
        set({ trashBookmarks: [], trashLoading: false });
        return;
      }

      const batch = writeBatch(db);
      trashBookmarks.forEach((bookmark) => {
        batch.delete(doc(db, "bookmarks", bookmark.id));
      });

      await batch.commit();
      set({ trashBookmarks: [], trashLoading: false });
    },

    cleanupOldTrash: async (userId: string) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, "bookmarks"),
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
                batch.delete(doc(db, "bookmarks", docSnapshot.id));
                deletedCount++;
              }
            });

            if (deletedCount > 0) {
              try {
                await batch.commit();
                console.log(
                  `${deletedCount}개의 오래된 휴지통 항목이 삭제되었습니다.`
                );
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
        const bookmarkRef = doc(db, "bookmarks", bookmark.id);
        batch.update(bookmarkRef, { order: index });
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

    toggleFavorite: async (
      bookmarkId: string,
      isFavorite: boolean,
      userId: string
    ) => {
      if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");

      const bookmarkRef = doc(db, "bookmarks", bookmarkId);
      await updateDoc(bookmarkRef, {
        isFavorite,
        updatedAt: new Date(),
      });
    },

    updateBookmarkFavicon: async (
      bookmarkId: string,
      url: string,
      userId: string
    ) => {
      if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");

      const newFavicon = await refreshFavicon(url);
      const bookmarkRef = doc(db, "bookmarks", bookmarkId);
      await updateDoc(bookmarkRef, {
        favicon: newFavicon,
        updatedAt: new Date(),
      });
      return newFavicon;
    },
  }),
  {
    name: "bookmarkle-cache",
    storage: dateAwareStorage,
    // rawBookmarks, collections만 캐시 (loading 등 UI 상태는 제외)
    partialize: (state) => ({
      rawBookmarks: state.rawBookmarks,
      collections:  state.collections,
    }),
  }
));
