import React, { useState, useEffect } from "react";
import { DashboardOverview } from "../../components/dashboard/DashboardOverview";
import { useAuthStore, useBookmarkStore, useCollectionStore } from "../../stores";
import { DisabledUserMessage } from "../../components/common/DisabledUserMessage";
import type { Bookmark, BookmarkFormData } from "../../types";
import toast from "react-hot-toast";
import { AddBookmarkModal } from "../../components/bookmarks/modals/AddBookmarkModal";
import { EditBookmarkModal } from "../../components/bookmarks/modals/EditBookmarkModal";
import { DeleteBookmarkModal } from "../../components/bookmarks/modals/DeleteBookmarkModal";
import { AddCollectionModal } from "../../components/collections/modals/AddCollectionModal";
import { Drawer } from "../../components/layout/Drawer";
import { useTranslation } from "react-i18next";
import { usePasteBookmark } from "../../hooks/bookmark/usePasteBookmark";
import { useShallow } from "zustand/react/shallow";
import { auth } from "../../firebase";
import {
  gateAddBookmark,
  gateAddSubCollection,
  showLimitToast,
} from "../../utils/planAccess";

export const DashboardPage: React.FC = () => {
  const { user, isActive, loading: authLoading, hasCachedSession } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      isActive: state.isActive,
      loading: state.loading,
      hasCachedSession: state.hasCachedSession,
    }))
  );
  const { t } = useTranslation();
  const {
    getFilteredBookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    toggleFavorite,
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
      toggleFavorite: state.toggleFavorite,
      subscribeToBookmarks: state.subscribeToBookmarks,
      setSelectedCollection: state.setSelectedCollection,
      setCollections: state.setCollections,
      loading: state.loading,
    }))
  );
  const {
    collections,
    addCollection,
    subscribeToCollections,
    loading: collectionsLoading,
  } = useCollectionStore(
    useShallow((state) => ({
      collections: state.collections,
      addCollection: state.addCollection,
      subscribeToCollections: state.subscribeToCollections,
      loading: state.loading,
    }))
  );
  // 북마크 데이터 가져오기
  const bookmarks = getFilteredBookmarks();
  const isAuthPrefetching = authLoading && hasCachedSession;

  // 북마크 스토어 상태 동기화 (대시보드는 "all" 컬렉션 사용)
  useEffect(() => {
    setBookmarkSelectedCollection("all");
    setBookmarkCollections(collections);
  }, [collections, setBookmarkSelectedCollection, setBookmarkCollections]);

  // 컬렉션 및 북마크 데이터 병렬 로드
  useEffect(() => {
    if (!user?.uid) return;

    // 실제 Firebase Auth 상태 확인 (authStore의 user만으로는 부족)
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== user.uid) {
      return;
    }

    // Start both operations in parallel
    const unsubscribeCollections = subscribeToCollections(user.uid);
    const unsubscribeBookmarks = subscribeToBookmarks(user.uid);

    return () => {
      unsubscribeCollections();
      unsubscribeBookmarks();
    };
  }, [user?.uid, subscribeToCollections, subscribeToBookmarks]);

  // 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [deleteBookmarkModal, setDeleteBookmarkModal] = useState<{
    isOpen: boolean;
    bookmark: Bookmark | null;
  }>({ isOpen: false, bookmark: null });
  const [isDeletingBookmark, setIsDeletingBookmark] = useState(false);
  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] =
    useState(false);

  // 북마크 추가
  const handleAddBookmark = async (data: BookmarkFormData) => {
    const gate = gateAddBookmark(user, useBookmarkStore.getState().rawBookmarks.length);
    if (!gate.ok) {
      showLimitToast(gate.reason);
      return;
    }
    try {
      console.log("DashboardPage - 북마크 추가 시도:", data);

      await addBookmark(
        {
          ...data,
          isFavorite: data.isFavorite || false,
        },
        user?.uid || ""
      );
      setIsAddModalOpen(false);
      toast.success(t("bookmarks.bookmarkAdded"));
    } catch (error) {
      console.error("DashboardPage - 북마크 추가 실패:", error);
      console.error("오류 상세:", {
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        stack: error instanceof Error ? error.stack : "스택 없음",
        type: typeof error,
      });

      // 사용자에게 더 구체적인 오류 메시지 표시
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      toast.error(`북마크 추가 실패: ${errorMessage}`);
    }
  };

  // 붙여넣기 북마크 추가 기능
  usePasteBookmark({
    onAddBookmark: handleAddBookmark,
    onOpenModal: () => setIsAddModalOpen(true),
    enabled: !!user && isActive !== false,
  });

  // 북마크 수정
  const handleUpdateBookmark = async (id: string, data: BookmarkFormData) => {
    try {
      await updateBookmark(
        id,
        {
          ...data,
          isFavorite: data.isFavorite || false,
        },
        user?.uid || ""
      );
      setEditingBookmark(null);
      toast.success(t("bookmarks.bookmarkUpdated"));
    } catch {
      toast.error("북마크 수정 중 오류가 발생했습니다.");
    }
  };

  // 북마크 삭제
  const handleDeleteBookmark = async (id: string) => {
    setIsDeletingBookmark(true);
    try {
      await deleteBookmark(id);
      setDeleteBookmarkModal({ isOpen: false, bookmark: null });
      toast.success(t("bookmarks.bookmarkDeleted"));
    } catch {
      toast.error("북마크 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeletingBookmark(false);
    }
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      await toggleFavorite(id, isFavorite, user?.uid || "");
      toast.success(
        isFavorite
          ? t("bookmarks.addToFavorites")
          : t("bookmarks.removeFromFavorites")
      );
    } catch {
      toast.error(t("bookmarks.favoriteToggleError"));
    }
  };

  // 북마크 편집 모달 열기
  const handleEdit = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
  };

  // 북마크 삭제 모달 열기
  const handleDelete = (bookmark: Bookmark) => {
    setDeleteBookmarkModal({ isOpen: true, bookmark });
  };

  // 컬렉션 추가
  const handleAddCollection = async (
    name: string,
    description: string,
    icon: string,
    parentId?: string | null
  ) => {
    const gate = gateAddSubCollection(user, parentId ?? null, collections);
    if (!gate.ok) {
      showLimitToast(gate.reason);
      return;
    }
    try {
      await addCollection(
        {
          name,
          description,
          icon,
          parentId: parentId ?? null,
        },
        user?.uid || ""
      );
      setIsAddCollectionModalOpen(false);
      toast.success(t("collections.collectionAdded"));
    } catch {
      toast.error(t("collections.collectionAddError"));
    }
  };

  if (!user && !isAuthPrefetching) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d10] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t("auth.loginRequired")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("auth.loginRequiredDescription")}
          </p>
        </div>
      </div>
    );
  }

  // 비활성화된 사용자 체크
  if (isActive === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d10] flex items-center justify-center">
        <DisabledUserMessage />
      </div>
    );
  }

  return (
    <Drawer>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d10]">
        <div className="p-4 lg:p-6">
          <DashboardOverview
            bookmarks={bookmarks}
            collections={collections}
            onEdit={handleEdit}
            onDelete={(id: string) => {
              const bookmark = bookmarks.find((b) => b.id === id);
              if (bookmark) {
                handleDelete(bookmark);
              }
            }}
            onAddBookmark={() => setIsAddModalOpen(true)}
            onAddCollection={() => setIsAddCollectionModalOpen(true)}
            onToggleFavorite={handleToggleFavorite}
            userId={user?.uid || ""}
            bookmarksLoading={bookmarksLoading}
            collectionsLoading={collectionsLoading}
          />
        </div>
        <AddBookmarkModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddBookmark}
          collections={collections}
        />
        <EditBookmarkModal
          isOpen={!!editingBookmark}
          onClose={() => setEditingBookmark(null)}
          onUpdate={handleUpdateBookmark}
          bookmark={editingBookmark}
          collections={collections}
        />
        <DeleteBookmarkModal
          isOpen={deleteBookmarkModal.isOpen}
          onClose={() =>
            setDeleteBookmarkModal({ isOpen: false, bookmark: null })
          }
          onDelete={() =>
            deleteBookmarkModal.bookmark &&
            handleDeleteBookmark(deleteBookmarkModal.bookmark.id)
          }
          bookmark={deleteBookmarkModal.bookmark}
          isDeleting={isDeletingBookmark}
        />
        <AddCollectionModal
          isOpen={isAddCollectionModalOpen}
          onClose={() => setIsAddCollectionModalOpen(false)}
          onAdd={handleAddCollection}
        />
      </div>
    </Drawer>
  );
};
