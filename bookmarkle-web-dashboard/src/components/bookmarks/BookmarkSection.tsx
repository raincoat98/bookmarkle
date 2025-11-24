import React from "react";
import type { Bookmark, Collection } from "../../types";
import { SortableBookmarkCard } from "./SortableBookmarkCard";
import { SortableBookmarkListItem } from "./SortableBookmarkListItem";
import { BookmarkCardSkeleton } from "./BookmarkCardSkeleton";
import { BookmarkListItemSkeleton } from "./BookmarkListItemSkeleton";
import { MobileIconSkeleton } from "./MobileIconSkeleton";
import { useTranslation } from "react-i18next";

interface BookmarkSectionProps {
  bookmarks: Bookmark[];
  sectionTitle?: string;
  sectionIcon?: string;
  isSubSection?: boolean;
  isLoading?: boolean;
  showSectionSkeleton?: boolean;
  viewMode: "grid" | "list";
  // 북마크 액션 props
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onRefreshFavicon?: (bookmark: Bookmark) => Promise<void>;
  faviconLoadingStates: Record<string, boolean>;
  collections: Collection[];
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onMoveUp: (bookmark: Bookmark) => void;
  onMoveDown: (bookmark: Bookmark) => void;
  movingBookmarkId: string | null;
  moveDirection: "up" | "down" | null;
}

export const BookmarkSection: React.FC<BookmarkSectionProps> = ({
  bookmarks,
  sectionTitle,
  sectionIcon,
  isSubSection = false,
  isLoading = false,
  showSectionSkeleton = false,
  viewMode,
  onEdit,
  onDelete,
  onRefreshFavicon,
  faviconLoadingStates,
  collections,
  onToggleFavorite,
  onMoveUp,
  onMoveDown,
  movingBookmarkId,
  moveDirection,
}) => {
  const { t } = useTranslation();

  // 로딩 중이거나 북마크가 없을 때 섹션 헤더만 표시하지 않음 (북마크가 없으면 null 반환)
  if (!isLoading && bookmarks.length === 0) return null;

  return (
    <div
      className={`space-y-4 ${
        isSubSection
          ? "ml-4 border-l-2 border-purple-200 dark:border-purple-700 pl-6"
          : ""
      }`}
    >
      {/* 섹션 헤더 또는 스켈레톤 */}
      {(sectionTitle || (isLoading && showSectionSkeleton)) && (
        <div
          className={`flex items-center gap-3 ${isSubSection ? "mt-6" : ""}`}
        >
          {isLoading && showSectionSkeleton ? (
            // 섹션 헤더 스켈레톤 (그룹화된 북마크 뷰에서 로딩 중일 때 표시)
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isSubSection
                  ? "bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700"
                  : "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800"
              }`}
            >
              {/* 아이콘 스켈레톤 */}
              <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0 animate-pulse"></div>
              {/* 제목 스켈레톤 */}
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
              {/* 카운트 배지 스켈레톤 */}
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-full w-12 animate-pulse"></div>
            </div>
          ) : sectionTitle ? (
            // 실제 섹션 헤더
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isSubSection
                  ? "bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700"
                  : "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800"
              }`}
            >
              {sectionIcon && <span className="text-lg">{sectionIcon}</span>}
              <h3
                className={`font-semibold text-sm ${
                  isSubSection
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {sectionTitle}
              </h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  isSubSection
                    ? "bg-purple-200 dark:bg-purple-700 text-purple-700 dark:text-purple-300"
                    : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
                }`}
              >
                {t("bookmarks.count", { count: bookmarks.length })}
              </span>
            </div>
          ) : null}
        </div>
      )}
      {/* 북마크 그리드/리스트 또는 스켈레톤 */}
      {isLoading ? (
        <>
          {/* 모바일 아이콘 뷰 스켈레톤 */}
          <div className="block sm:hidden">
            <div className="grid grid-cols-5 gap-2 p-3 justify-items-center">
              {Array.from({ length: 10 }).map((_, idx) => (
                <MobileIconSkeleton key={`skeleton-mobile-${idx}`} />
              ))}
            </div>
          </div>

          {/* 데스크톱 뷰 스켈레톤 */}
          <div className="hidden sm:block">
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5"
                  : "space-y-3"
              }
            >
              {Array.from({ length: 6 }).map((_, idx) =>
                viewMode === "grid" ? (
                  <BookmarkCardSkeleton key={`skeleton-${idx}`} />
                ) : (
                  <BookmarkListItemSkeleton key={`skeleton-${idx}`} />
                )
              )}
            </div>
          </div>
        </>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5"
              : "space-y-3"
          }
        >
          {bookmarks.map((bookmark, idx) =>
            viewMode === "grid" ? (
              <SortableBookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onEdit={onEdit}
                onDelete={onDelete}
                onRefreshFavicon={
                  onRefreshFavicon
                    ? () => onRefreshFavicon(bookmark)
                    : async () => {}
                }
                faviconLoading={faviconLoadingStates[bookmark.id] || false}
                collections={collections}
                onToggleFavorite={onToggleFavorite}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                isFirst={idx === 0}
                isLast={idx === bookmarks.length - 1}
                isMoving={movingBookmarkId === bookmark.id}
                moveDirection={moveDirection}
              />
            ) : (
              <SortableBookmarkListItem
                key={bookmark.id}
                bookmark={bookmark}
                onEdit={onEdit}
                onDelete={onDelete}
                onRefreshFavicon={
                  onRefreshFavicon
                    ? () => onRefreshFavicon(bookmark)
                    : undefined
                }
                faviconLoading={faviconLoadingStates[bookmark.id] || false}
                collections={collections}
                onToggleFavorite={onToggleFavorite}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                isFirst={idx === 0}
                isLast={idx === bookmarks.length - 1}
                isMoving={movingBookmarkId === bookmark.id}
                moveDirection={moveDirection}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};
