import React, { useState, useMemo } from "react";
import { BookmarkList } from "../components/bookmarks/BookmarkList";
import { AddBookmarkModal } from "../components/bookmarks/AddBookmarkModal";
import { EditBookmarkModal } from "../components/bookmarks/EditBookmarkModal";
import { DeleteBookmarkModal } from "../components/bookmarks/DeleteBookmarkModal";
import { AddCollectionModal } from "../components/collections/AddCollectionModal";
import { EditCollectionModal } from "../components/collections/EditCollectionModal";
import {
  useAuthStore,
  useBookmarkStore,
  useCollectionStore,
  useSubscriptionStore,
} from "../stores";
import { DisabledUserMessage } from "../components/common/DisabledUserMessage";
import { useNotifications } from "../hooks/useNotifications";
import type {
  Bookmark,
  BookmarkFormData,
  Collection,
  SortOption,
} from "../types";
import toast from "react-hot-toast";
import { Search, Grid3X3, List, Plus, FolderPlus } from "lucide-react";
import { Drawer } from "../components/layout/Drawer";
import { useTranslation } from "react-i18next";
import { UpgradeModal } from "../components/subscription/UpgradeModal";
import {
  checkBookmarkLimit,
  checkCollectionLimit,
} from "../utils/subscriptionLimits";
import { usePasteBookmark } from "../hooks/usePasteBookmark";

export const BookmarksPage: React.FC = () => {
  const { user, isActive, isActiveLoading } = useAuthStore();
  const { plan, limits } = useSubscriptionStore();
  const { t } = useTranslation();

  // 상태 관리
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<
    "bookmark_limit" | "collection_limit" | "premium_feature"
  >("bookmark_limit");

  // 정렬 상태 관리
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
    fetchCollections,
  } = useCollectionStore();

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
  } = useBookmarkStore();

  // 핀된 컬렉션을 기본 탭으로 설정
  React.useEffect(() => {
    if (collections.length > 0) {
      const pinnedCollection = collections.find((col) => col.isPinned);
      if (pinnedCollection) {
        setSelectedCollection((current) =>
          current === "all" ? pinnedCollection.id : current
        );
      }
    }
  }, [collections]);

  const { createNotification } = useNotifications(user?.uid || "");

  // 북마크 데이터 가져오기
  const bookmarks = getFilteredBookmarks();

  // 북마크 스토어 상태 동기화
  React.useEffect(() => {
    setBookmarkSelectedCollection(selectedCollection);
    setBookmarkCollections(collections);
  }, [
    selectedCollection,
    collections,
    setBookmarkSelectedCollection,
    setBookmarkCollections,
  ]);

  // 컬렉션 데이터 가져오기
  React.useEffect(() => {
    if (user?.uid) {
      fetchCollections(user.uid);
    }
  }, [user?.uid, fetchCollections]);

  // 북마크 구독 설정
  React.useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeToBookmarks(user.uid);
      return unsubscribe;
    }
  }, [user?.uid, subscribeToBookmarks]);

  // 나머지 상태 관리
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetCollectionId, setTargetCollectionId] = useState<string | null>(
    null
  );
  const [targetCollectionName, setTargetCollectionName] = useState<string>("");
  const [deletingCollectionId, setDeletingCollectionId] = useState<
    string | null
  >(null);
  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] =
    useState(false);
  const [isAddSubCollectionModalOpen, setIsAddSubCollectionModalOpen] =
    useState(false);
  const [subCollectionParentId, setSubCollectionParentId] = useState<
    string | null
  >(null);

  // 북마크 삭제 모달 상태
  const [deleteBookmarkModal, setDeleteBookmarkModal] = useState<{
    isOpen: boolean;
    bookmark: Bookmark | null;
  }>({
    isOpen: false,
    bookmark: null,
  });
  const [isDeletingBookmark, setIsDeletingBookmark] = useState(false);

  // 전체 북마크에서 사용된 태그 집계
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    bookmarks.forEach((b) => b.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [bookmarks]);

  // 하위 컬렉션 ID들을 재귀적으로 가져오는 함수
  const getChildCollectionIds = React.useCallback(
    (parentId: string): string[] => {
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
    [collections]
  );

  // parentId의 깊이 계산 함수
  const getCollectionDepth = (id: string | null): number => {
    let depth = 0;
    let current = collections.find((col) => col.id === id);
    while (current && current.parentId) {
      depth++;
      const parent = collections.find((col) => col.id === current!.parentId);
      if (!parent) break;
      current = parent;
    }
    return depth;
  };

  // 컬렉션 추가 핸들러
  const handleAddCollection = async (
    name: string,
    description: string,
    icon: string,
    parentId?: string | null,
    isPinned?: boolean
  ) => {
    // parentId의 깊이가 2 이상이면 추가 불가
    if (parentId && getCollectionDepth(parentId) >= 2) {
      toast.error(t("collections.maxDepthExceeded"));
      return;
    }

    // 컬렉션 제한 체크
    const collectionLimit = checkCollectionLimit(collections.length, plan);
    if (!collectionLimit.allowed) {
      setUpgradeReason("collection_limit");
      setShowUpgradeModal(true);
      return;
    }

    try {
      const collectionId = await addCollection(
        {
          name,
          description,
          icon,
          parentId: parentId ?? null,
          isPinned: isPinned ?? false,
        },
        user?.uid || ""
      );

      // 핀이 설정된 경우, 다른 컬렉션들의 핀을 해제
      if (isPinned && collectionId) {
        await setPinned(collectionId, true);
      }

      toast.success(t("collections.collectionAdded"));
    } catch (error) {
      console.error("Error adding collection:", error);
      toast.error(t("collections.collectionAddError"));
    }
  };

  // 필터링된 북마크 (검색 및 태그 필터링만)
  const filteredBookmarksData = useMemo(() => {
    const filtered = bookmarks.filter((bookmark) => {
      const matchesSearch = searchTerm
        ? bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bookmark.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (bookmark.description &&
            bookmark.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
        : true;

      const matchesTag = selectedTag
        ? bookmark.tags && bookmark.tags.includes(selectedTag)
        : true;

      return matchesSearch && matchesTag;
    });

    // 하위 컬렉션이 있는 경우 그룹화 (즐겨찾기는 제외)
    if (
      selectedCollection !== "all" &&
      selectedCollection !== "none" &&
      selectedCollection !== "favorites" &&
      selectedCollection
    ) {
      const childCollectionIds = getChildCollectionIds(selectedCollection);
      if (childCollectionIds.length > 0) {
        const selectedCollectionBookmarks = filtered.filter(
          (bookmark) => bookmark.collection === selectedCollection
        );

        const groupedBookmarks: {
          collectionId: string;
          collectionName: string;
          bookmarks: Bookmark[];
        }[] = [];

        childCollectionIds.forEach((childId) => {
          const childCollection = collections.find((col) => col.id === childId);
          if (childCollection) {
            const childBookmarks = filtered.filter(
              (bookmark) => bookmark.collection === childId
            );
            if (childBookmarks.length > 0) {
              groupedBookmarks.push({
                collectionId: childId,
                collectionName: childCollection.name,
                bookmarks: childBookmarks,
              });
            }
          }
        });

        return {
          isGrouped: true,
          selectedCollectionBookmarks,
          selectedCollectionName:
            collections.find((col) => col.id === selectedCollection)?.name ||
            t("collections.selectedCollection"),
          groupedBookmarks,
        };
      }
    }

    return {
      isGrouped: false,
      bookmarks: filtered,
    };
  }, [
    bookmarks,
    searchTerm,
    selectedCollection,
    selectedTag,
    collections,
    getChildCollectionIds,
    t,
  ]);

  // 이벤트 핸들러들
  const handleAddBookmark = async (bookmarkData: BookmarkFormData) => {
    // 북마크 제한 체크
    const bookmarkLimit = checkBookmarkLimit(bookmarks.length, plan);
    if (!bookmarkLimit.allowed) {
      setUpgradeReason("bookmark_limit");
      setShowUpgradeModal(true);
      return;
    }

    try {
      console.log("BookmarksPage - 북마크 추가 시도:", bookmarkData);

      const bookmarkId = await addBookmark(
        {
          ...bookmarkData,
          isFavorite: bookmarkData.isFavorite || false,
        },
        user?.uid || ""
      );
      setIsAddModalOpen(false);
      toast.success(t("bookmarks.bookmarkAdded"));

      // 알림 생성 (에러가 나도 알림은 생성되도록)
      try {
        await createNotification(
          "bookmark_added",
          undefined,
          `"${bookmarkData.title}" 북마크가 추가되었습니다`,
          bookmarkId
        );
      } catch (notifError) {
        console.error("알림 생성 실패:", notifError);
      }
    } catch (error) {
      console.error("BookmarksPage - 북마크 추가 실패:", error);
      console.error("오류 상세:", {
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        stack: error instanceof Error ? error.stack : "스택 없음",
        type: typeof error,
      });

      // 사용자에게 더 구체적인 오류 메시지 표시
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      toast.error(`${t("bookmarks.bookmarkAddError")}: ${errorMessage}`);
    }
  };

  // 붙여넣기 북마크 추가 기능
  usePasteBookmark({
    onAddBookmark: handleAddBookmark,
    onOpenModal: () => setIsAddModalOpen(true),
    enabled: !!user && isActive !== false,
  });

  const handleUpdateBookmark = async (
    id: string,
    bookmarkData: BookmarkFormData
  ) => {
    try {
      await updateBookmark(
        id,
        {
          ...bookmarkData,
          isFavorite: bookmarkData.isFavorite || false,
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
          `"${bookmarkData.title}" 북마크가 수정되었습니다`,
          id
        );
      } catch (notifError) {
        console.error("알림 생성 실패:", notifError);
      }
    } catch (error) {
      console.error("Error updating bookmark:", error);
      toast.error(t("bookmarks.bookmarkUpdateError"));
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    setIsDeletingBookmark(true);
    try {
      const bookmark = deleteBookmarkModal.bookmark;
      await deleteBookmark(id);
      setDeleteBookmarkModal({ isOpen: false, bookmark: null });
      toast.success(t("bookmarks.bookmarkDeleted"));

      // 알림 생성 (에러가 나도 알림은 생성되도록)
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
        isFavorite
          ? t("bookmarks.addToFavorites")
          : t("bookmarks.removeFromFavorites")
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error(t("bookmarks.favoriteToggleError"));
    }
  };

  // 파비콘 새로고침 핸들러 추가
  const handleRefreshFavicon = async (bookmarkId: string, url: string) => {
    try {
      const newFavicon = await updateBookmarkFavicon(
        bookmarkId,
        url,
        user?.uid || ""
      );
      toast.success(t("bookmarks.faviconRefreshed"));
      return newFavicon;
    } catch (error) {
      console.error("Error refreshing favicon:", error);
      toast.error(t("bookmarks.faviconRefreshError"));
      throw error;
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
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
  };

  const handleUpdateCollection = async (
    collectionId: string,
    collectionData: Partial<Collection>
  ) => {
    try {
      // isPinned가 변경된 경우 setPinned 함수 사용
      if ("isPinned" in collectionData) {
        await setPinned(collectionId, collectionData.isPinned || false);
        // isPinned를 제외한 나머지 데이터만 updateCollection으로 처리
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isPinned: _, ...otherData } = collectionData;
        if (Object.keys(otherData).length > 0) {
          await updateCollection(collectionId, otherData);
        }
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
    console.log(
      "handleReorderBookmarks called with:",
      newBookmarks.length,
      "bookmarks"
    ); // 디버깅 로그
    console.log("Current bookmarks length:", bookmarks.length); // 현재 상태 로그
    console.log(
      "New bookmarks order:",
      newBookmarks.map((b) => ({ id: b.id, title: b.title }))
    ); // 새로운 순서 로그

    try {
      // Firestore에 순서 업데이트
      await reorderBookmarks(newBookmarks, user?.uid || "");

      console.log("Bookmarks reordered successfully"); // 디버깅 로그
      console.log("Updated bookmarks length:", newBookmarks.length); // 업데이트 후 상태 로그
      // toast.success("북마크 순서가 변경되었습니다."); // 중복 토스트 제거
    } catch (error) {
      console.error("Error reordering bookmarks:", error);
      toast.error(t("bookmarks.reorderError"));
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
    <Drawer
      collections={collections}
      selectedCollection={selectedCollection}
      onCollectionChange={setSelectedCollection}
      onDeleteCollectionRequest={(id, name) => {
        setTargetCollectionId(id);
        setTargetCollectionName(name);
        setShowDeleteModal(true);
      }}
      onEditCollection={(collection) => {
        setEditingCollection(collection);
        setShowEditModal(true);
      }}
      onOpenAddCollectionModal={() => setIsAddCollectionModalOpen(true)}
      onOpenAddSubCollectionModal={(parentId) => {
        setSubCollectionParentId(parentId);
        setIsAddSubCollectionModalOpen(true);
      }}
    >
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        {/* 북마크 리스트 상단 컨트롤 바 */}
        <div className="flex-shrink-0 sticky top-0 z-10 h-[80px] px-4 lg:px-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm flex items-center">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
            {/* 검색창 - 모든 화면 크기에서 보임 */}
            <div className="relative w-full sm:flex-1 min-w-0">
              <input
                type="text"
                placeholder={t("bookmarks.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 h-[44px] border border-slate-300/50 dark:border-slate-600/50 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm shadow-sm text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>

            {/* 데스크톱 컨트롤 */}
            <div className="hidden sm:flex items-center gap-3 lg:gap-4">
              {/* 뷰 모드 토글 버튼 - 데스크톱에서만 */}
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 shadow-lg h-[44px]">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all duration-200 min-w-[36px] h-full flex items-center justify-center ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={t("bookmarks.gridView")}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all duration-200 min-w-[36px] h-full flex items-center justify-center ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={t("bookmarks.listView")}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* 데스크톱 버튼들 */}
              <div className="flex gap-2 lg:gap-3">
                <button
                  onClick={() => setIsAddCollectionModalOpen(true)}
                  className="inline-flex items-center justify-center px-4 lg:px-6 py-2 h-[44px] bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap shadow-lg hover:shadow-xl"
                >
                  <FolderPlus className="w-4 h-4 lg:w-5 lg:h-5 mr-1.5 lg:mr-2" />
                  <span className="hidden lg:inline">
                    {t("collections.addCollection")}
                  </span>
                  <span className="lg:hidden">컬렉션</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center justify-center px-4 lg:px-6 py-2 h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-4 h-4 lg:w-5 lg:h-5 mr-1.5 lg:mr-2" />
                  <span className="hidden lg:inline">
                    {t("bookmarks.addBookmark")}
                  </span>
                  <span className="lg:hidden">북마크</span>
                </button>
              </div>
            </div>
          </div>

          {/* 모바일 버튼들 - 한 줄에 2개 */}
          <div className="grid grid-cols-2 gap-2 mt-3 sm:hidden absolute bottom-3 left-4 right-4">
            <button
              onClick={() => setIsAddCollectionModalOpen(true)}
              className="flex items-center justify-center px-3 py-2 h-[40px] bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-medium rounded-xl transition-all duration-200 shadow-lg"
            >
              <FolderPlus className="w-4 h-4 mr-1.5" />
              <span>컬렉션</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center px-3 py-2 h-[40px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium rounded-xl transition-all duration-200 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>북마크</span>
            </button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto w-full min-w-0 overflow-x-hidden">
          {(() => {
            // 필터링된 북마크 데이터에서 실제 북마크 배열 추출
            let bookmarksToDisplay: Bookmark[] = [];

            if (Array.isArray(filteredBookmarksData)) {
              bookmarksToDisplay = filteredBookmarksData;
            } else if (filteredBookmarksData.isGrouped) {
              // 그룹된 데이터의 경우 모든 북마크를 평면화
              const groupedData = filteredBookmarksData as {
                isGrouped: true;
                selectedCollectionBookmarks: Bookmark[];
                selectedCollectionName: string;
                groupedBookmarks: {
                  collectionId: string;
                  collectionName: string;
                  bookmarks: Bookmark[];
                }[];
              };
              bookmarksToDisplay = [
                ...groupedData.selectedCollectionBookmarks,
                ...groupedData.groupedBookmarks.flatMap(
                  (group) => group.bookmarks
                ),
              ];
            } else {
              bookmarksToDisplay = filteredBookmarksData.bookmarks || [];
            }

            return (
              <BookmarkList
                bookmarks={bookmarksToDisplay}
                onEdit={setEditingBookmark}
                onDelete={(bookmark: Bookmark) => {
                  setDeleteBookmarkModal({
                    isOpen: true,
                    bookmark: bookmark,
                  });
                }}
                onToggleFavorite={handleToggleFavorite}
                onReorder={handleReorderBookmarks}
                onRefreshFavicon={handleRefreshFavicon} // 파비콘 새로고침 함수 전달
                collections={collections}
                searchTerm="" // 이미 필터링된 북마크를 전달하므로 빈 문자열
                viewMode={viewMode}
                currentSort={currentSort}
                onSortChange={setCurrentSort}
                groupedBookmarks={
                  filteredBookmarksData.isGrouped
                    ? filteredBookmarksData
                    : undefined
                }
                loading={bookmarksLoading}
              />
            );
          })()}

          {/* 태그 필터 UI */}
          {(() => {
            const currentBookmarks = (() => {
              if (
                typeof filteredBookmarksData === "object" &&
                "isGrouped" in filteredBookmarksData &&
                filteredBookmarksData.isGrouped
              ) {
                const groupedData = filteredBookmarksData as {
                  isGrouped: true;
                  selectedCollectionBookmarks: Bookmark[];
                  selectedCollectionName: string;
                  groupedBookmarks: {
                    collectionId: string;
                    collectionName: string;
                    bookmarks: Bookmark[];
                  }[];
                };
                return [
                  ...groupedData.selectedCollectionBookmarks,
                  ...groupedData.groupedBookmarks.flatMap(
                    (group) => group.bookmarks
                  ),
                ];
              } else {
                const bookmarksArray = Array.isArray(filteredBookmarksData)
                  ? filteredBookmarksData
                  : filteredBookmarksData.bookmarks || [];
                return bookmarksArray;
              }
            })();

            const hasBookmarksWithTags = currentBookmarks.some(
              (bookmark) => bookmark.tags && bookmark.tags.length > 0
            );

            return allTags.length > 0 && hasBookmarksWithTags ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 shadow-sm ${
                    selectedTag === null
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-500 shadow-lg"
                      : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:shadow-md backdrop-blur-sm"
                  }`}
                  onClick={() => setSelectedTag(null)}
                >
                  {t("collections.all")}
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 shadow-sm ${
                      selectedTag === tag
                        ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-500 shadow-lg"
                        : "bg-white/80 dark:bg-slate-800/80 text-purple-700 dark:text-purple-300 border-slate-300 dark:border-slate-600 hover:shadow-md backdrop-blur-sm hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    }`}
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* 모달들 */}
      <AddBookmarkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={({ title, url, description, collection, tags, isFavorite }) => {
          handleAddBookmark({
            title,
            url,
            description: description || "",
            collection: collection || "",
            tags,
            isFavorite,
          });
        }}
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
        onDelete={handleDeleteBookmark}
        bookmark={deleteBookmarkModal.bookmark}
        isDeleting={isDeletingBookmark}
      />

      <EditCollectionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCollection(null);
        }}
        onUpdate={handleUpdateCollection}
        collection={editingCollection}
        collections={collections}
      />

      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xs">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("collections.deleteCollection")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              <span className="font-bold">{targetCollectionName}</span>{" "}
              {t("collections.deleteConfirmation")}
              <br />
              {t("collections.deleteWarning")}
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() =>
                  targetCollectionId &&
                  handleDeleteCollection(targetCollectionId)
                }
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                disabled={deletingCollectionId === targetCollectionId}
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddCollectionModal
        isOpen={isAddCollectionModalOpen}
        onClose={() => setIsAddCollectionModalOpen(false)}
        onAdd={handleAddCollection}
      />

      <AddCollectionModal
        isOpen={isAddSubCollectionModalOpen}
        onClose={() => {
          setIsAddSubCollectionModalOpen(false);
          setSubCollectionParentId(null);
        }}
        onAdd={handleAddCollection}
        parentId={subCollectionParentId}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
        currentCount={
          upgradeReason === "bookmark_limit"
            ? bookmarks.length
            : upgradeReason === "collection_limit"
            ? collections.length
            : undefined
        }
        limit={
          upgradeReason === "bookmark_limit"
            ? limits.maxBookmarks
            : upgradeReason === "collection_limit"
            ? limits.maxCollections
            : undefined
        }
      />
    </Drawer>
  );
};
