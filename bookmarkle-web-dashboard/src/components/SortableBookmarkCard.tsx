import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark, Collection } from "../types";
import { renderCollectionIcon } from "../utils/iconRenderer";
import { useTranslation } from "react-i18next";

interface SortableBookmarkCardProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onRefreshFavicon: (bookmark: Bookmark) => Promise<void>;
  faviconLoading: boolean;
  collections: Collection[];
  onMoveUp?: (bookmark: Bookmark) => void;
  onMoveDown?: (bookmark: Bookmark) => void;
  isFirst?: boolean;
  isLast?: boolean;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  isMoving?: boolean; // 이동 중인지 여부
  moveDirection?: "up" | "down" | null; // 이동 방향
}

export const SortableBookmarkCard = ({
  bookmark,
  onEdit,
  onDelete,
  onRefreshFavicon,
  faviconLoading,
  collections,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  onToggleFavorite,
  isMoving = false, // 이동 중인지 여부
  moveDirection = null, // 이동 방향
}: SortableBookmarkCardProps) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: bookmark.id,
    data: {
      bookmark: bookmark,
    },
  });

  // 디버깅 로그 제거 - 불필요한 렌더링 방지

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onEdit(bookmark);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onDelete(bookmark);
  };

  const handleRefreshFavicon = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    await onRefreshFavicon(bookmark);
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onMoveUp?.(bookmark);
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onMoveDown?.(bookmark);
  };

  const collection = collections.find((col) => col.id === bookmark.collection);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 w-full min-w-0 max-w-full box-border overflow-hidden backdrop-blur-sm ${
        isDragging ? "opacity-50 shadow-2xl" : ""
      } ${
        isMoving
          ? `animate-pulse shadow-2xl ring-4 ${
              moveDirection === "up"
                ? "ring-green-300 dark:ring-green-600 -translate-y-2"
                : "ring-blue-300 dark:ring-blue-600 translate-y-2"
            }`
          : ""
      }`}
    >
      {/* 이동 방향 인디케이터 */}
      {isMoving && (
        <div
          className={`absolute top-2 left-1/2 transform -translate-x-1/2 z-50 ${
            moveDirection === "up" ? "animate-bounce" : ""
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              moveDirection === "up"
                ? "bg-green-500 text-white"
                : "bg-blue-500 text-white"
            } shadow-lg`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={moveDirection === "up" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
              />
            </svg>
          </div>
        </div>
      )}

      {/* 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {/* 드래그 핸들러 - 데스크톱에서만 호버 시 표시 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 sm:top-3 sm:left-3 hidden sm:flex opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-grab active:cursor-grabbing z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm min-w-[36px] min-h-[36px] items-center justify-center"
      >
        <svg
          className="w-6 h-6 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-200"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        </svg>
      </div>
      {/* 액션 버튼들 - 모바일에서 항상 보이도록, 데스크톱에서는 hover 시 보이도록 */}
      <div
        className="absolute top-2 right-2 flex flex-wrap gap-1 z-30 w-full max-w-full overflow-x-auto justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 pointer-events-auto"
        style={{ pointerEvents: "auto" }}
      >
        {/* 상하 이동 버튼들 - 모바일에서만 표시 */}
        <button
          onClick={handleMoveUp}
          disabled={isFirst}
          className="sm:hidden md:hidden lg:hidden xl:hidden 2xl:hidden p-1 min-w-[32px] min-h-[32px] text-gray-700 hover:text-green-600 dark:text-gray-200 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation flex-shrink-0 border border-gray-300 dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent flex items-center justify-center"
          title={t("common.moveUp")}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
        <button
          onClick={handleMoveDown}
          disabled={isLast}
          className="sm:hidden md:hidden lg:hidden xl:hidden 2xl:hidden p-1 min-w-[32px] min-h-[32px] text-gray-700 hover:text-green-600 dark:text-gray-200 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation flex-shrink-0 border border-gray-300 dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent flex items-center justify-center"
          title={t("common.moveDown")}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {/* 즐겨찾기 버튼 */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            onToggleFavorite(bookmark.id, !bookmark.isFavorite);
          }}
          className={`p-2 min-w-[32px] min-h-[32px] rounded-lg transition-all duration-200 flex items-center justify-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation flex-shrink-0 ${
            bookmark.isFavorite
              ? "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          }`}
          title={t("bookmarks.isFavorite")}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
          </svg>
        </button>
        {/* 수정 버튼 */}
        <button
          onClick={handleEdit}
          className="p-2 min-w-[32px] min-h-[32px] text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation flex-shrink-0"
          title={t("common.edit")}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6"
            />
          </svg>
        </button>
        {/* 삭제 버튼 */}
        <button
          onClick={handleDelete}
          className="p-2 min-w-[32px] min-h-[32px] text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation flex-shrink-0"
          title={t("common.delete")}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      {/* 카드 내용 - 모바일에서 수직 배치 */}
      <div className="p-4 sm:p-5 pt-20 sm:pt-16 relative z-10 pointer-events-none">
        <div className="flex flex-col sm:flex-row sm:items-start gap-y-3 sm:space-x-4 pointer-events-auto">
          {/* 파비콘 - 모바일에서 위쪽 */}
          <div className="relative flex-shrink-0 flex justify-center sm:block mb-2 sm:mb-0">
            <div
              className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-900/30 dark:to-accent-900/30 flex items-center justify-center shadow-sm group/favicon cursor-pointer hover:bg-gradient-to-br hover:from-brand-200 hover:to-accent-200 dark:hover:from-brand-800/50 dark:hover:to-accent-800/50 transition-all duration-200"
              onClick={handleRefreshFavicon}
              title={t("common.refreshFavicon")}
            >
              {bookmark.favicon ? (
                <img
                  src={bookmark.favicon}
                  alt={t("common.favicon")}
                  className="w-8 h-8 sm:w-6 sm:h-6 rounded-lg group-hover/favicon:opacity-70 transition-opacity duration-200"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <svg
                  className="w-6 h-6 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 group-hover/favicon:text-brand-500 dark:group-hover/favicon:text-brand-400 transition-colors duration-200"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}

              {/* 호버 시 새로고침 아이콘 표시 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/favicon:opacity-100 transition-opacity duration-200 bg-black/20 dark:bg-white/10 rounded-lg backdrop-blur-sm">
                <svg
                  className="w-4 h-4 sm:w-3 sm:h-3 text-white dark:text-gray-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
            </div>

            {/* 로딩 상태 표시 */}
            {faviconLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-lg backdrop-blur-sm">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-5 sm:w-5 border-2 border-brand-500 border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* 텍스트 및 정보 영역 - 수직 배치 */}
          <div className="flex-1 min-w-0 flex flex-col gap-y-2">
            <div className="flex items-center space-x-2 mb-1 pointer-events-auto">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                }}
                onMouseDown={(e) => {
                  if (isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                }}
                onTouchStart={(e) => {
                  if (isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                }}
                className={`text-lg sm:text-base font-semibold text-gray-900 dark:text-white truncate hover:text-brand-600 dark:hover:text-brand-400 transition-colors duration-200 cursor-pointer pointer-events-auto ${
                  isDragging ? "pointer-events-none opacity-50" : ""
                }`}
                title={bookmark.title}
              >
                {bookmark.title}
              </a>
            </div>
            <p className="text-sm sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {bookmark.url}
            </p>
            {/* 컬렉션 정보 - 모바일에서 아래쪽 */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {collection ? (
                <span className="inline-flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1 rounded-full text-sm sm:text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
                  {renderCollectionIcon(collection.icon, "w-4 h-4")}{" "}
                  {collection.name}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-2 sm:px-2.5 sm:py-1 rounded-full text-sm sm:text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  {t("collections.noCollection")}
                </span>
              )}
              <div className="text-sm sm:text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-2 sm:px-2 sm:py-1 rounded-md">
                {bookmark.createdAt.toLocaleDateString()}
              </div>
            </div>
            {/* 태그 배지 - 모바일에서 아래쪽 */}
            {bookmark.tags && bookmark.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-1.5 mb-1">
                {bookmark.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-full text-sm sm:text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 shadow-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {bookmark.description && (
              <p className="text-sm sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 transition-colors duration-200 leading-relaxed">
                {bookmark.description}
              </p>
            )}
          </div>
        </div>
        {/* 방문하기 버튼: 모바일에서 전체 너비, 데스크톱은 우측 정렬 */}
        <div className="flex mt-4 sm:justify-end relative z-30 pointer-events-auto">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
            onMouseDown={(e) => {
              if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
            onTouchStart={(e) => {
              if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }}
            className={`inline-flex items-center justify-center w-full sm:w-auto space-x-2 px-4 py-3 sm:px-4 sm:py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/30 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md active:scale-95 min-h-[44px] sm:min-h-[36px] z-30 pointer-events-auto ${
              isDragging ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <span>{t("common.visit")}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};
