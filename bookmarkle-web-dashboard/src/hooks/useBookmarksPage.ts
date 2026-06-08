import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import toast from "react-hot-toast";
import {
  useAuthStore,
  useBookmarkStore,
  useCollectionStore,
  useSubscriptionStore,
} from "../stores";
import type {
  Bookmark,
  BookmarkFormData,
  Collection,
  SortOption,
} from "../types";
import { auth } from "../firebase";
import { checkBookmarkLimit, checkCollectionLimit } from "../utils/subscriptionLimits";
import { usePasteBookmark } from "./usePasteBookmark";
import { useFilteredBookmarks } from "./useFilteredBookmarks";

export const useBookmarksPage = () => {
  const { user, isActive } = useAuthStore(
    useShallow((state) => ({ user: state.user, isActive: state.isActive }))
  );
  const { plan, limits } = useSubscriptionStore(
    useShallow((state) => ({ plan: state.plan, limits: state.limits }))
  );
  const { t } = useTranslation();

  const [selectedCollection, setSelectedCollection] = useState("all");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<
    "bookmark_limit" | "collection_limit" | "premium_feature"
  >("bookmark_limit");
  const [currentSort, setCurrentSort] = useState<SortOption>({
    field: "order",
    direction: "asc",
    label: t("bookmarks.sortByUserOrder"),
  });

  const {
    collections,
    addCollection,
    updateCollection,
    deleteCollection,
    setPinned,
    subscribeToCollections,
  } = useCollectionStore(
    useShallow((state) => ({
      collections: state.collections,
      addCollection: state.addCollection,
      updateCollection: state.updateCollection,
      deleteCollection: state.deleteCollection,
      setPinned: state.setPinned,
      subscribeToCollections: state.subscribeToCollections,
    }))
  );

  const {
    getFilteredBookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    reorderBookmarks,
    toggleFavorite,
    updateBookmarkFavicon,
    subscribeToBookmarks,
    setSelectedCollection: setBookmarkSelectedCollection,
    setCollections: setBookmarkCollections,
    loading: bookmarksLoading,
  } = useBookmarkStore(
    useShallow((state) => ({
      getFilteredBookmarks: state.getFilteredBookmarks,
      addBookmark: state.addBookmark,
      updateBookmark: state.updateBookmark,
      deleteBookmark: state.deleteBookmark,
      reorderBookmarks: state.reorderBookmarks,
      toggleFavorite: state.toggleFavorite,
      updateBookmarkFavicon: state.updateBookmarkFavicon,
      subscribeToBookmarks: state.subscribeToBookmarks,
      setSelectedCollection: state.setSelectedCollection,
      setCollections: state.setCollections,
      loading: state.loading,
    }))
  );

  // 핀된 컬렉션을 기본 탭으로
  useEffect(() => {
    if (collections.length > 0) {
      const pinned = collections.find((col) => col.isPinned);
      if (pinned) {
        setSelectedCollection((current) =>
          current === "all" ? pinned.id : current
        );
      }
    }
  }, [collections]);

  const bookmarks = getFilteredBookmarks();

  useEffect(() => {
    setBookmarkSelectedCollection(selectedCollection);
    setBookmarkCollections(collections);
  }, [selectedCollection, collections, setBookmarkSelectedCollection, setBookmarkCollections]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToCollections(user.uid);
  }, [user?.uid, subscribeToCollections]);

  useEffect(() => {
    if (!user?.uid) return;
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== user.uid) return;
    return subscribeToBookmarks(user.uid);
  }, [user?.uid, subscribeToBookmarks]);

  const [deferredLoading, setDeferredLoading] = useState(false);
  useEffect(() => {
    if (!bookmarksLoading) {
      setDeferredLoading(false);
      return;
    }
    const timer = setTimeout(() => setDeferredLoading(true), 400);
    return () => clearTimeout(timer);
  }, [bookmarksLoading]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("bookmarkViewMode");
    return saved === "grid" || saved === "list" ? saved : "grid";
  });

  useEffect(() => {
    localStorage.setItem("bookmarkViewMode", viewMode);
  }, [viewMode]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetCollectionId, setTargetCollectionId] = useState<string | null>(null);
  const [targetCollectionName, setTargetCollectionName] = useState<string>("");
  const [deletingCollectionId, setDeletingCollectionId] = useState<string | null>(null);
  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] = useState(false);
  const [isAddSubCollectionModalOpen, setIsAddSubCollectionModalOpen] = useState(false);
  const [subCollectionParentId, setSubCollectionParentId] = useState<string | null>(null);
  const [deleteBookmarkModal, setDeleteBookmarkModal] = useState<{
    isOpen: boolean;
    bookmark: Bookmark | null;
  }>({ isOpen: false, bookmark: null });
  const [isDeletingBookmark, setIsDeletingBookmark] = useState(false);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    bookmarks.forEach((b) => b.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [bookmarks]);

  const filteredBookmarksData = useFilteredBookmarks(
    bookmarks,
    searchTerm,
    selectedCollection,
    selectedTag,
    collections
  );

  const bookmarksToDisplay = useMemo<Bookmark[]>(() => {
    if (filteredBookmarksData.isGrouped) {
      return [
        ...filteredBookmarksData.selectedCollectionBookmarks,
        ...filteredBookmarksData.groupedBookmarks.flatMap((g) => g.bookmarks),
      ];
    }
    return filteredBookmarksData.bookmarks ?? [];
  }, [filteredBookmarksData]);

  const visibleTags = useMemo(
    () => allTags.filter((tag) => bookmarksToDisplay.some((b) => b.tags?.includes(tag))),
    [allTags, bookmarksToDisplay]
  );

  const getCollectionDepth = useCallback(
    (id: string | null): number => {
      let depth = 0;
      let current = collections.find((col) => col.id === id);
      while (current?.parentId) {
        depth++;
        const parent = collections.find((col) => col.id === current!.parentId);
        if (!parent) break;
        current = parent;
      }
      return depth;
    },
    [collections]
  );

  const handleAddCollection = async (
    name: string,
    description: string,
    icon: string,
    parentId?: string | null,
    isPinned?: boolean
  ) => {
    if (parentId && getCollectionDepth(parentId) >= 2) {
      toast.error(t("collections.maxDepthExceeded"));
      return;
    }
    const limit = checkCollectionLimit(collections.length, plan);
    if (!limit.allowed) {
      setUpgradeReason("collection_limit");
      setShowUpgradeModal(true);
      return;
    }
    try {
      const collectionId = await addCollection(
        { name, description, icon, parentId: parentId ?? null, isPinned: isPinned ?? false },
        user?.uid || ""
      );
      if (isPinned && collectionId) await setPinned(collectionId, true);
      toast.success(t("collections.collectionAdded"));
    } catch (error) {
      console.error("Error adding collection:", error);
      toast.error(t("collections.collectionAddError"));
    }
  };

  const handleAddBookmark = async (bookmarkData: BookmarkFormData) => {
    const limit = checkBookmarkLimit(bookmarks.length, plan);
    if (!limit.allowed) {
      setUpgradeReason("bookmark_limit");
      setShowUpgradeModal(true);
      return;
    }
    try {
      await addBookmark(
        { ...bookmarkData, isFavorite: bookmarkData.isFavorite || false },
        user?.uid || ""
      );
      setIsAddModalOpen(false);
      toast.success(t("bookmarks.bookmarkAdded"));
    } catch (error) {
      console.error("Error adding bookmark:", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      toast.error(`${t("bookmarks.bookmarkAddError")}: ${message}`);
    }
  };

  usePasteBookmark({
    onAddBookmark: handleAddBookmark,
    onOpenModal: () => setIsAddModalOpen(true),
    enabled: !!user && isActive !== false,
  });

  const handleUpdateBookmark = async (id: string, bookmarkData: BookmarkFormData) => {
    try {
      await updateBookmark(
        id,
        { ...bookmarkData, isFavorite: bookmarkData.isFavorite || false },
        user?.uid || ""
      );
      setEditingBookmark(null);
      toast.success(t("bookmarks.bookmarkUpdated"));
    } catch (error) {
      console.error("Error updating bookmark:", error);
      toast.error(t("bookmarks.bookmarkUpdateError"));
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    setIsDeletingBookmark(true);
    try {
      await deleteBookmark(id);
      setDeleteBookmarkModal({ isOpen: false, bookmark: null });
      toast.success(t("bookmarks.bookmarkDeleted"));
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      toast.error(t("bookmarks.bookmarkDeleteError"));
    } finally {
      setIsDeletingBookmark(false);
    }
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      await toggleFavorite(id, isFavorite, user?.uid || "");
      toast.success(
        isFavorite ? t("bookmarks.addToFavorites") : t("bookmarks.removeFromFavorites")
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error(t("bookmarks.favoriteToggleError"));
    }
  };

  const handleRefreshFavicon = async (bookmarkId: string, url: string) => {
    try {
      const newFavicon = await updateBookmarkFavicon(bookmarkId, url, user?.uid || "");
      toast.success(t("bookmarks.faviconRefreshed"));
      return newFavicon;
    } catch (error) {
      console.error("Error refreshing favicon:", error);
      toast.error(t("bookmarks.faviconRefreshError"));
      throw error;
    }
  };

  const handleDeleteCollection = useCallback(
    async (collectionId: string) => {
      setDeletingCollectionId(collectionId);
      try {
        await deleteCollection(collectionId, user?.uid || "");
        toast.success(t("collections.collectionDeleted"));
        setDeletingCollectionId(null);
        setShowDeleteModal(false);
      } catch (error) {
        console.error("Error deleting collection:", error);
        toast.error(t("collections.collectionDeleteError"));
        setDeletingCollectionId(null);
      }
    },
    [deleteCollection, user?.uid, t]
  );

  useEffect(() => {
    if (!showDeleteModal || !targetCollectionId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (deletingCollectionId !== targetCollectionId) {
          handleDeleteCollection(targetCollectionId);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowDeleteModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteModal, targetCollectionId, deletingCollectionId, handleDeleteCollection]);

  const handleUpdateCollection = async (
    collectionId: string,
    collectionData: Partial<Collection>
  ) => {
    try {
      if ("isPinned" in collectionData) {
        await setPinned(collectionId, collectionData.isPinned || false);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isPinned: _, ...rest } = collectionData;
        if (Object.keys(rest).length > 0) await updateCollection(collectionId, rest);
      } else {
        await updateCollection(collectionId, collectionData);
      }
      toast.success(t("collections.collectionUpdated"));
      setShowEditModal(false);
      setEditingCollection(null);
    } catch (error) {
      console.error("Error updating collection:", error);
      toast.error(t("collections.collectionUpdateError"));
    }
  };

  const handleReorderBookmarks = async (newBookmarks: Bookmark[]) => {
    try {
      await reorderBookmarks(newBookmarks, user?.uid || "");
    } catch (error) {
      console.error("Error reordering bookmarks:", error);
      toast.error(t("bookmarks.reorderError"));
    }
  };

  const openDeleteCollectionModal = useCallback((id: string, name: string) => {
    setTargetCollectionId(id);
    setTargetCollectionName(name);
    setShowDeleteModal(true);
  }, []);

  const openEditCollectionModal = useCallback((collection: Collection) => {
    setEditingCollection(collection);
    setShowEditModal(true);
  }, []);

  return {
    user,
    isActive,
    collections,
    bookmarks,
    limits,
    plan,
    deferredLoading,
    selectedCollection,
    setSelectedCollection,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    selectedTag,
    setSelectedTag,
    currentSort,
    setCurrentSort,
    isAddModalOpen,
    setIsAddModalOpen,
    editingBookmark,
    setEditingBookmark,
    deleteBookmarkModal,
    setDeleteBookmarkModal,
    isDeletingBookmark,
    showEditModal,
    editingCollection,
    setEditingCollection,
    showDeleteModal,
    setShowDeleteModal,
    targetCollectionId,
    targetCollectionName,
    deletingCollectionId,
    isAddCollectionModalOpen,
    setIsAddCollectionModalOpen,
    isAddSubCollectionModalOpen,
    setIsAddSubCollectionModalOpen,
    subCollectionParentId,
    setSubCollectionParentId,
    showUpgradeModal,
    setShowUpgradeModal,
    upgradeReason,
    filteredBookmarksData,
    bookmarksToDisplay,
    visibleTags,
    handleAddBookmark,
    handleUpdateBookmark,
    handleDeleteBookmark,
    handleToggleFavorite,
    handleRefreshFavicon,
    handleDeleteCollection,
    handleUpdateCollection,
    handleReorderBookmarks,
    handleAddCollection,
    openDeleteCollectionModal,
    openEditCollectionModal,
  };
};
