import { create } from "zustand";
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
} from "firebase/firestore";
import { db } from "../firebase";
import type { Bookmark, BookmarkFormData, Collection } from "../types";
import { getFaviconUrl, refreshFavicon } from "../utils/favicon";
import {
  showBookmarkNotification,
  getNotificationPermission,
} from "../utils/browserNotifications";

const isSystemNotificationEnabled = () => {
  const saved = localStorage.getItem("systemNotifications");
  if (saved !== null) return JSON.parse(saved);
  const fallback = localStorage.getItem("notifications");
  if (fallback !== null) return JSON.parse(fallback);
  return true;
};

interface BookmarkState {
  rawBookmarks: Bookmark[];
  loading: boolean;
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

export const useBookmarkStore = create<BookmarkState & BookmarkActions>(
  (set, get) => ({
    // State
    rawBookmarks: [],
    loading: true,
    selectedCollection: "all",
    collections: [],

    // Actions
    setRawBookmarks: (bookmarks) => set({ rawBookmarks: bookmarks }),
    setLoading: (loading) => set({ loading }),
    setSelectedCollection: (collection) =>
      set({ selectedCollection: collection }),
    setCollections: (collections) => set({ collections }),

    // 하위 컬렉션 ID들을 재귀적으로 가져오는 함수
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

    // 필터링된 북마크 반환
    getFilteredBookmarks: (): Bookmark[] => {
      const { rawBookmarks, selectedCollection, getChildCollectionIds } = get();
      let filtered = rawBookmarks;

      if (selectedCollection === "none") {
        // 컬렉션이 없는 북마크들
        filtered = rawBookmarks.filter(
          (bookmark) =>
            !bookmark.collection ||
            bookmark.collection === "" ||
            bookmark.collection === null
        );
      } else if (selectedCollection !== "all") {
        // 특정 컬렉션의 북마크들 (하위 컬렉션 포함)
        const childCollectionIds = getChildCollectionIds(selectedCollection);
        const targetCollectionIds = [selectedCollection, ...childCollectionIds];

        filtered = rawBookmarks.filter(
          (bookmark) =>
            bookmark.collection &&
            targetCollectionIds.includes(String(bookmark.collection))
        );
      }

      // 사용자 순서로 정렬 (order 필드 기준)
      return [...filtered].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // order가 없는 경우 생성일 기준으로 정렬 (최신순)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    },

    // 북마크 구독
    subscribeToBookmarks: (userId: string) => {
      const { selectedCollection } = get();

      // 컬렉션에 따라 쿼리 조건 설정
      let q;
      if (selectedCollection === "none") {
        q = query(collection(db, "bookmarks"), where("userId", "==", userId));
      } else if (selectedCollection === "all") {
        q = query(collection(db, "bookmarks"), where("userId", "==", userId));
      } else {
        q = query(collection(db, "bookmarks"), where("userId", "==", userId));
      }

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const bookmarkList: Bookmark[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            bookmarkList.push({
              id: doc.id,
              title: data.title || "",
              url: data.url || "",
              description: data.description || "",
              favicon: data.favicon || "",
              collection: data.collection || null,
              order: data.order || 0,
              userId: data.userId || "",
              createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
              updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
              tags: data.tags || [],
              isFavorite: data.isFavorite || false,
            });
          });

          set({ rawBookmarks: bookmarkList, loading: false });
        },
        (error) => {
          console.error("북마크 로딩 오류:", error);
          set({ loading: false });
        }
      );

      return unsubscribe;
    },

    // favicon 필드 마이그레이션 함수
    migrateFavicons: async (userId: string) => {
      const { rawBookmarks } = get();
      if (!userId) return;

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
        try {
          await batch.commit();
          console.log(
            `${updatedCount}개의 북마크 파비콘이 마이그레이션되었습니다.`
          );
        } catch (error) {
          console.error("파비콘 마이그레이션 실패:", error);
        }
      }
    },

    // isFavorite 필드 마이그레이션 함수
    migrateIsFavorite: async (userId: string) => {
      const { rawBookmarks } = get();
      if (!userId) return;

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
        try {
          await batch.commit();
          console.log(
            `${updatedCount}개의 북마크 isFavorite 필드가 마이그레이션되었습니다.`
          );
        } catch (error) {
          console.error("isFavorite 마이그레이션 실패:", error);
        }
      }
    },

    // 북마크 추가
    addBookmark: async (bookmarkData: BookmarkFormData, userId: string) => {
      const { rawBookmarks } = get();
      if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");

      try {
        console.log("북마크 추가 시작:", bookmarkData);

        // 데이터 유효성 검사
        if (!bookmarkData.title || !bookmarkData.title.trim()) {
          throw new Error("북마크 제목은 필수입니다.");
        }

        if (!bookmarkData.url || !bookmarkData.url.trim()) {
          throw new Error("북마크 URL은 필수입니다.");
        }

        // URL 유효성 검사
        try {
          new URL(
            bookmarkData.url.startsWith("http")
              ? bookmarkData.url
              : `https://${bookmarkData.url}`
          );
        } catch {
          throw new Error("올바른 URL 형식이 아닙니다.");
        }

        // favicon이 없으면 자동으로 가져오기
        let favicon = bookmarkData.favicon;
        if (!favicon && bookmarkData.url) {
          favicon = getFaviconUrl(bookmarkData.url);
        }

        const newBookmark = {
          title: bookmarkData.title.trim(),
          url: bookmarkData.url.trim(),
          description: bookmarkData.description || "",
          favicon: favicon || "",
          collection: bookmarkData.collection || null,
          order: bookmarkData.order ?? rawBookmarks.length,
          userId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: Array.isArray(bookmarkData.tags) ? bookmarkData.tags : [],
          isFavorite: Boolean(bookmarkData.isFavorite),
        };

        console.log("Firestore에 저장할 북마크 데이터:", newBookmark);

        // Firestore에 저장
        const docRef = await addDoc(collection(db, "bookmarks"), newBookmark);
        console.log("북마크 추가 성공, 문서 ID:", docRef.id);

        // 브라우저 알림 표시
        const permission = getNotificationPermission();
        if (permission.granted && isSystemNotificationEnabled()) {
          showBookmarkNotification("added", bookmarkData.title);
        }

        return docRef.id;
      } catch (error) {
        console.error("북마크 추가 실패 - 상세 오류:", error);
        throw error;
      }
    },

    // 북마크 수정
    updateBookmark: async (
      bookmarkId: string,
      bookmarkData: BookmarkFormData,
      userId: string
    ) => {
      if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");

      // favicon이 없으면 자동으로 가져오기
      let favicon = bookmarkData.favicon;
      if (!favicon && bookmarkData.url) {
        favicon = getFaviconUrl(bookmarkData.url);
      }

      const bookmarkRef = doc(db, "bookmarks", bookmarkId);
      await updateDoc(bookmarkRef, {
        title: bookmarkData.title,
        url: bookmarkData.url,
        description: bookmarkData.description || "",
        favicon: favicon || "",
        collection: bookmarkData.collection || null,
        updatedAt: new Date(),
        tags: bookmarkData.tags || [],
        isFavorite: bookmarkData.isFavorite || false,
      });

      // 브라우저 알림 표시
      const permission = getNotificationPermission();
      if (permission.granted && isSystemNotificationEnabled()) {
        showBookmarkNotification("updated", bookmarkData.title);
      }
    },

    // 북마크 삭제
    deleteBookmark: async (bookmarkId: string) => {
      const { rawBookmarks } = get();

      // 삭제 전에 북마크 정보 가져오기 (알림용)
      const bookmarkToDelete = rawBookmarks.find((b) => b.id === bookmarkId);

      await deleteDoc(doc(db, "bookmarks", bookmarkId));

      // 브라우저 알림 표시
      if (bookmarkToDelete) {
        const permission = getNotificationPermission();
        if (permission.granted && isSystemNotificationEnabled()) {
          showBookmarkNotification("deleted", bookmarkToDelete.title);
        }
      }
    },

    // 북마크 순서 변경
    reorderBookmarks: async (newBookmarks: Bookmark[], userId: string) => {
      if (!userId) return;

      console.log("=== reorderBookmarks 시작 ===");
      console.log(
        "새로운 순서:",
        newBookmarks.map((b, i) => `${i}: ${b.title} (order: ${b.order})`)
      );

      const batch = writeBatch(db);

      newBookmarks.forEach((bookmark, index) => {
        const bookmarkRef = doc(db, "bookmarks", bookmark.id);
        batch.update(bookmarkRef, { order: index });
        console.log(`Firestore 업데이트: ${bookmark.title} -> order: ${index}`);
      });

      await batch.commit();
      console.log("Firestore 업데이트 완료");

      // 로컬 상태 즉시 업데이트
      set((state) => {
        console.log("로컬 상태 업데이트 시작");
        console.log(
          "이전 상태:",
          state.rawBookmarks.map(
            (b, i) => `${i}: ${b.title} (order: ${b.order})`
          )
        );

        const updated = [...state.rawBookmarks];
        newBookmarks.forEach((bookmark, index) => {
          const existingIndex = updated.findIndex((b) => b.id === bookmark.id);
          if (existingIndex !== -1) {
            updated[existingIndex] = {
              ...updated[existingIndex],
              order: index,
            };
            console.log(`로컬 업데이트: ${bookmark.title} -> order: ${index}`);
          }
        });

        console.log(
          "업데이트 후 상태:",
          updated.map((b, i) => `${i}: ${b.title} (order: ${b.order})`)
        );
        return { rawBookmarks: updated };
      });

      console.log("=== reorderBookmarks 완료 ===");
    },

    // 즐겨찾기 토글
    toggleFavorite: async (
      bookmarkId: string,
      isFavorite: boolean,
      userId: string
    ) => {
      if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");

      const bookmarkRef = doc(db, "bookmarks", bookmarkId);
      await updateDoc(bookmarkRef, {
        isFavorite: isFavorite,
        updatedAt: new Date(),
      });
    },

    // 파비콘 새로고침
    updateBookmarkFavicon: async (
      bookmarkId: string,
      url: string,
      userId: string
    ) => {
      if (!userId) throw new Error("사용자가 로그인되지 않았습니다.");

      try {
        const newFavicon = await refreshFavicon(url);
        const bookmarkRef = doc(db, "bookmarks", bookmarkId);
        await updateDoc(bookmarkRef, {
          favicon: newFavicon,
          updatedAt: new Date(),
        });
        return newFavicon;
      } catch (error) {
        console.error("파비콘 새로고침 실패:", error);
        throw error;
      }
    },
  })
);
