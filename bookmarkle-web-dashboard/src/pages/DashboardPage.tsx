import React, { useState, useEffect } from "react";
import { DashboardOverview } from "../components/dashboard/DashboardOverview";
import { useAuthStore, useBookmarkStore, useCollectionStore } from "../stores";
import { DisabledUserMessage } from "../components/DisabledUserMessage";
import { useNotifications } from "../hooks/useNotifications";
import type { Bookmark, BookmarkFormData, SortOption } from "../types";
import toast from "react-hot-toast";
import { AddBookmarkModal } from "../components/AddBookmarkModal";
import { EditBookmarkModal } from "../components/EditBookmarkModal";
import { DeleteBookmarkModal } from "../components/DeleteBookmarkModal";
import { AddCollectionModal } from "../components/AddCollectionModal";
import { Drawer } from "../components/Drawer";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { useTranslation } from "react-i18next";

export const DashboardPage: React.FC = () => {
  const { user, isActive, isActiveLoading } = useAuthStore();
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
  } = useBookmarkStore();
  const {
    collections,
    addCollection,
    fetchCollections,
    loading: collectionsLoading,
  } = useCollectionStore();
  const { createNotification } = useNotifications(user?.uid || "");

  // 북마크 데이터 가져오기
  const bookmarks = getFilteredBookmarks();

  // 북마크 스토어 상태 동기화 (대시보드는 "all" 컬렉션 사용)
  useEffect(() => {
    setBookmarkSelectedCollection("all");
    setBookmarkCollections(collections);
  }, [collections, setBookmarkSelectedCollection, setBookmarkCollections]);

  // 컬렉션 데이터 가져오기
  useEffect(() => {
    if (user?.uid) {
      fetchCollections(user.uid);
    }
  }, [user?.uid, fetchCollections]);

  // 북마크 구독 설정
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeToBookmarks(user.uid);
      return unsubscribe;
    }
  }, [user?.uid, subscribeToBookmarks]);

  // 정렬 상태 관리
  const [currentSort, setCurrentSort] = useState<SortOption>({
    field: "isFavorite",
    direction: "desc",
    label: t("dashboard.sortByFavorite"),
  });

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
    try {
      console.log("DashboardPage - 북마크 추가 시도:", data);

      const bookmarkId = await addBookmark(
        {
          ...data,
          isFavorite: data.isFavorite || false,
        },
        user?.uid || ""
      );
      setIsAddModalOpen(false);
      toast.success(t("bookmarks.bookmarkAdded"));

      // 알림 생성
      try {
        await createNotification(
          "bookmark_added",
          undefined,
          `"${data.title}" 북마크가 추가되었습니다`,
          bookmarkId
        );
      } catch (notifError) {
        console.error("알림 생성 실패:", notifError);
      }
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

      // 알림 생성 (에러가 나도 알림은 생성되도록)
      try {
        await createNotification(
          "bookmark_updated",
          undefined,
          `"${data.title}" 북마크가 수정되었습니다`,
          id
        );
      } catch (notifError) {
        console.error("알림 생성 실패:", notifError);
      }
    } catch {
      toast.error("북마크 수정 중 오류가 발생했습니다.");
    }
  };

  // 북마크 삭제
  const handleDeleteBookmark = async (id: string) => {
    setIsDeletingBookmark(true);
    try {
      const bookmark = deleteBookmarkModal.bookmark;
      await deleteBookmark(id);
      setDeleteBookmarkModal({ isOpen: false, bookmark: null });
      toast.success(t("bookmarks.bookmarkDeleted"));

      // 알림 생성
      if (bookmark) {
        try {
          await createNotification(
            "bookmark_deleted",
            undefined,
            `"${bookmark.title}" 북마크가 삭제되었습니다`,
            id
          );
        } catch (notifError) {
          console.error("알림 생성 실패:", notifError);
        }
      }
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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
  if (!isActiveLoading && isActive === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <DisabledUserMessage />
      </div>
    );
  }

  return (
    <Drawer>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-4 lg:p-6">
          <UpgradeBanner />
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
            currentSort={currentSort}
            onSortChange={setCurrentSort}
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
