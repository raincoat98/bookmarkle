import type { Bookmark } from "../types";
import type {
  BookmarkActions,
  BookmarkStoreGet,
  BookmarkStoreSet,
} from "./bookmarkStoreTypes";

type BookmarkSelectorActions = Pick<
  BookmarkActions,
  | "setRawBookmarks"
  | "setLoading"
  | "setSelectedCollection"
  | "setCollections"
  | "getChildCollectionIds"
  | "getFilteredBookmarks"
>;

export const createBookmarkSelectors = (
  set: BookmarkStoreSet,
  get: BookmarkStoreGet
): BookmarkSelectorActions => ({
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
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },
});
