import React, { useMemo, useState } from "react";
import type { Bookmark, Collection, SortOption } from "../../types";
import { sortBookmarks } from "../../utils/sortBookmarks";
import { useBookmarkActions } from "../../hooks/bookmark/useBookmarkActions";
import { BookmarkListHeader } from "./BookmarkListHeader";
import { BookmarkGridView } from "./BookmarkGridView";
import { GroupedBookmarkView } from "./GroupedBookmarkView";
import { EmptyBookmarkState } from "./EmptyBookmarkState";
import { BookmarkSection } from "./BookmarkSection";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onDirectDelete: (bookmark: Bookmark) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onReorder: (newBookmarks: Bookmark[]) => void;
  onMoveBookmark?: (bookmarkId: string, newCollectionId: string | null, allBookmarksNewOrder: Bookmark[]) => Promise<void>;
  selectedCollectionId?: string;
  onRefreshFavicon?: (bookmarkId: string, url: string) => Promise<string>;
  collections?: Collection[];
  searchTerm: string;
  viewMode: "grid" | "list";
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  groupedBookmarks?: {
    isGrouped: boolean;
    selectedCollectionBookmarks?: Bookmark[];
    selectedCollectionName?: string;
    groupedBookmarks?: {
      collectionId: string;
      collectionName: string;
      bookmarks: Bookmark[];
    }[];
  };
  loading?: boolean;
  collectionLabel?: string;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onDirectDelete,
  onToggleFavorite,
  onReorder,
  onMoveBookmark,
  selectedCollectionId,
  onRefreshFavicon,
  collections = [],
  searchTerm,
  viewMode,
  currentSort,
  onSortChange,
  groupedBookmarks,
  loading = false,
  collectionLabel,
}) => {
  // 필터링 및 정렬된 북마크
  const filteredAndSortedBookmarks = useMemo(() => {
    let filtered = bookmarks;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(term) ||
          bookmark.url.toLowerCase().includes(term) ||
          (bookmark.description &&
            bookmark.description.toLowerCase().includes(term))
      );
    }

    return sortBookmarks(filtered, currentSort);
  }, [bookmarks, searchTerm, currentSort]);

  // 그룹화된 북마크 정렬 처리
  const sortedGroupedBookmarks = useMemo(() => {
    if (!groupedBookmarks?.isGrouped) return undefined;

    // showSubCollections는 GroupedBookmarkView 내부에서 관리
    return {
      ...groupedBookmarks,
      selectedCollectionBookmarks: sortBookmarks(
        groupedBookmarks.selectedCollectionBookmarks || [],
        currentSort
      ),
      groupedBookmarks: groupedBookmarks.groupedBookmarks?.map((group) => ({
        ...group,
        bookmarks: sortBookmarks(group.bookmarks, currentSort),
      })),
    };
  }, [groupedBookmarks, currentSort]);

  // 북마크 액션 훅 사용
  const [isEditMode, setIsEditMode] = useState(false);

  const { faviconLoadingStates, handleRefreshFavicon } = useBookmarkActions({
    onRefreshFavicon,
  });

  // 파비콘 새로고침 핸들러 래퍼
  const handleRefreshFaviconWrapper = async (bookmark: Bookmark) => {
    await handleRefreshFavicon(bookmark);
  };

  // 로딩 중일 때 스켈레톤 표시
  if (loading) {
    return (
      <div className="space-y-6">
        <BookmarkListHeader
          totalCount={0}
          currentSort={currentSort}
          onSortChange={onSortChange}
          loading={true}
        />
        <BookmarkSection
          bookmarks={[]}
          isLoading={true}
          showSectionSkeleton={false}
          viewMode={viewMode}
          onEdit={onEdit}
          onDelete={onDelete}
          onRefreshFavicon={handleRefreshFaviconWrapper}
          faviconLoadingStates={faviconLoadingStates}
          collections={collections}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
    );
  }

  // 그룹화된 북마크가 있는 경우 그룹화된 뷰 렌더링
  if (sortedGroupedBookmarks?.isGrouped) {
    return (
      <GroupedBookmarkView
        sortedGroupedBookmarks={sortedGroupedBookmarks}
        groupedBookmarks={groupedBookmarks}
        collections={collections}
        viewMode={viewMode}
        currentSort={currentSort}
        onSortChange={onSortChange}
        loading={loading}
        onEdit={onEdit}
        onDelete={onDelete}
        onDirectDelete={onDirectDelete}
        onToggleFavorite={onToggleFavorite}
        onReorder={onReorder}
        onMoveBookmark={onMoveBookmark}
        selectedCollectionId={selectedCollectionId}
        onRefreshFavicon={handleRefreshFaviconWrapper}
        faviconLoadingStates={faviconLoadingStates}
      />
    );
  }

  // 일반 북마크 리스트 렌더링
  return (
    <div className="space-y-6">
      <BookmarkListHeader
        totalCount={filteredAndSortedBookmarks.length}
        currentSort={currentSort}
        onSortChange={onSortChange}
        loading={loading}
        collectionLabel={collectionLabel}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode((v) => !v)}
      />

      {filteredAndSortedBookmarks.length > 0 ? (
        <BookmarkGridView
          bookmarks={filteredAndSortedBookmarks}
          viewMode={viewMode}
          onEdit={onEdit}
          onDelete={onDelete}
          onDirectDelete={onDirectDelete}
          onToggleFavorite={onToggleFavorite}
          onReorder={onReorder}
          onRefreshFavicon={handleRefreshFaviconWrapper}
          faviconLoadingStates={faviconLoadingStates}
          collections={collections}
          isEditMode={isEditMode}
          onEditModeChange={setIsEditMode}
        />
      ) : (
        <EmptyBookmarkState searchTerm={searchTerm} />
      )}
    </div>
  );
};
