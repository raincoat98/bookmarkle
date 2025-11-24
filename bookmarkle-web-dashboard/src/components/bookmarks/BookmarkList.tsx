import React, { useMemo } from "react";
import type { Bookmark, Collection, SortOption } from "../../types";
import { sortBookmarks } from "../../utils/sortBookmarks";
import { useBookmarkActions } from "../../hooks/useBookmarkActions";
import { BookmarkListHeader } from "./BookmarkListHeader";
import { BookmarkGridView } from "./BookmarkGridView";
import { GroupedBookmarkView } from "./GroupedBookmarkView";
import { EmptyBookmarkState } from "./EmptyBookmarkState";
import { BookmarkSection } from "./BookmarkSection";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onReorder: (newBookmarks: Bookmark[]) => void;
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
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onToggleFavorite,
  onReorder,
  onRefreshFavicon,
  collections = [],
  searchTerm,
  viewMode,
  currentSort,
  onSortChange,
  groupedBookmarks,
  loading = false,
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
  const {
    faviconLoadingStates,
    movingBookmarkId,
    moveDirection,
    handleMoveUp,
    handleMoveDown,
    handleRefreshFavicon,
  } = useBookmarkActions({
    bookmarks,
    onReorder,
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
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          movingBookmarkId={movingBookmarkId}
          moveDirection={moveDirection}
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
        onToggleFavorite={onToggleFavorite}
        onReorder={onReorder}
        onRefreshFavicon={handleRefreshFaviconWrapper}
        faviconLoadingStates={faviconLoadingStates}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        movingBookmarkId={movingBookmarkId}
        moveDirection={moveDirection}
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
      />

      {filteredAndSortedBookmarks.length > 0 ? (
        <BookmarkGridView
          bookmarks={filteredAndSortedBookmarks}
          viewMode={viewMode}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onReorder={onReorder}
          onRefreshFavicon={handleRefreshFaviconWrapper}
          faviconLoadingStates={faviconLoadingStates}
          collections={collections}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          movingBookmarkId={movingBookmarkId}
          moveDirection={moveDirection}
        />
      ) : (
        <EmptyBookmarkState searchTerm={searchTerm} />
      )}
    </div>
  );
};
