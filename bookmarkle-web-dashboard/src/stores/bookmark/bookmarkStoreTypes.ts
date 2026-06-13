import type { Bookmark, BookmarkFormData, Collection } from "../../types";

export interface BookmarkState {
  rawBookmarks: Bookmark[];
  trashBookmarks: Bookmark[];
  loading: boolean;
  trashLoading: boolean;
  selectedCollection: string;
  collections: Collection[];
}

export interface BookmarkActions {
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
  moveBookmarkToCollection: (
    bookmarkId: string,
    newCollection: string | null,
    allBookmarksNewOrder: Bookmark[]
  ) => Promise<void>;
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

export type BookmarkStore = BookmarkState & BookmarkActions;

export type BookmarkStoreSet = (
  partial:
    | Partial<BookmarkStore>
    | ((state: BookmarkStore) => Partial<BookmarkStore>)
) => void;

export type BookmarkStoreGet = () => BookmarkStore;
