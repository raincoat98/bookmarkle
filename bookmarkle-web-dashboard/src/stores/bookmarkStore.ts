import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createBookmarkMigrations } from "./bookmarkStoreMigrations";
import { createBookmarkMutations } from "./bookmarkStoreMutations";
import { dateAwareStorage } from "./bookmarkStorePersistence";
import { createBookmarkSelectors } from "./bookmarkStoreSelectors";
import { createBookmarkSubscriptions } from "./bookmarkStoreSubscriptions";
import type {
  BookmarkStore,
  BookmarkStoreGet,
  BookmarkStoreSet,
} from "./bookmarkStoreTypes";

const initialBookmarkState = {
  rawBookmarks: [],
  trashBookmarks: [],
  loading: true,
  trashLoading: true,
  selectedCollection: "all",
  collections: [],
};

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => {
      const storeSet = set as BookmarkStoreSet;
      const storeGet = get as BookmarkStoreGet;

      return {
        ...initialBookmarkState,
        ...createBookmarkSelectors(storeSet, storeGet),
        ...createBookmarkSubscriptions(storeSet),
        ...createBookmarkMigrations(storeGet),
        ...createBookmarkMutations(storeSet, storeGet),
      };
    },
    {
      name: "bookmarkle-cache",
      storage: dateAwareStorage,
      // rawBookmarks, collections만 캐시 (loading 등 UI 상태는 제외)
      partialize: (state) => ({
        rawBookmarks: state.rawBookmarks,
        collections: state.collections,
      }),
    }
  )
);
