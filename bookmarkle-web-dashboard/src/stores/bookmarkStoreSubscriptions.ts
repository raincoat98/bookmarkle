import { onSnapshot } from "firebase/firestore";
import type { BookmarkActions } from "./bookmarkStoreTypes";
import type { BookmarkStoreSet } from "./bookmarkStoreTypes";
import {
  consumeLocalAdd,
  convertSnapshotToBookmark,
  createAddedBookmarkNotification,
  createSystemBookmarkAddedNotification,
  createUserBookmarksQuery,
  getActiveBookmarks,
  getTrashBookmarks,
  isPermissionOrAuthError,
  shouldEmitSystemNotification,
  sweepRecentLocalAdds,
  trackUnsubscribe,
  unsubscribeSilently,
} from "./bookmarkStoreHelpers";

type BookmarkSubscriptionActions = Pick<
  BookmarkActions,
  "subscribeToBookmarks" | "subscribeToTrash" | "cleanupAllListeners"
>;

let activeBookmarkListeners: (() => void)[] = [];
let activeTrashListeners: (() => void)[] = [];

export const createBookmarkSubscriptions = (
  set: BookmarkStoreSet
): BookmarkSubscriptionActions => ({
  subscribeToBookmarks: (userId: string) => {
    const q = createUserBookmarksQuery(userId);
    let isFirstSnapshot = true;

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const bookmarkList = getActiveBookmarks(querySnapshot.docs);

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
            createSystemBookmarkAddedNotification(change.doc.id, bookmark.title);
          }
          createAddedBookmarkNotification(userId, change.doc.id, bookmark.title);
        });

        sweepRecentLocalAdds();
      },
      (error) => {
        // 권한 오류 시 리스너 자동 정리
        if (isPermissionOrAuthError(error)) {
          // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
          unsubscribeSilently(unsubscribe);
          // cleanupAllListeners에서 정리됨
        } else {
          console.error("북마크 로딩 오류:", error);
        }
        set({ loading: false });
      }
    );

    return trackUnsubscribe(
      unsubscribe,
      () => activeBookmarkListeners,
      (listeners) => {
        activeBookmarkListeners = listeners;
      }
    );
  },

  subscribeToTrash: (userId: string) => {
    const q = createUserBookmarksQuery(userId);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const trashList = getTrashBookmarks(querySnapshot.docs);
        set({ trashBookmarks: trashList, trashLoading: false });
      },
      (error) => {
        // 권한 오류 시 리스너 자동 정리
        if (isPermissionOrAuthError(error)) {
          // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
          unsubscribeSilently(unsubscribe);
          // cleanupAllListeners에서 정리됨
        } else {
          console.error("휴지통 로딩 오류:", error);
        }
        set({ trashLoading: false });
      }
    );

    return trackUnsubscribe(
      unsubscribe,
      () => activeTrashListeners,
      (listeners) => {
        activeTrashListeners = listeners;
      }
    );
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
});
