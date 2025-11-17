import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark, Collection } from "../types";
import { renderCollectionIcon } from "../utils/iconRenderer";
import { useTranslation } from "react-i18next";

interface SortableBookmarkListItemProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  collections: Collection[];
  onMoveUp?: (bookmark: Bookmark) => void;
  onMoveDown?: (bookmark: Bookmark) => void;
  isFirst?: boolean;
  isLast?: boolean;

  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onRefreshFavicon?: (bookmark: Bookmark) => Promise<void>;
  faviconLoading?: boolean;
  isMoving?: boolean; // 이동 중인지 여부
  moveDirection?: "up" | "down" | null; // 이동 방향
}

export const SortableBookmarkListItem = ({
  bookmark,
  onEdit,
  onDelete,
  collections,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  onToggleFavorite, // 즐겨찾기 토글 함수 추가
  onRefreshFavicon, // 파비콘 새로고침 함수 추가
  faviconLoading = false, // 파비콘 로딩 상태 추가
  isMoving = false, // 이동 중인지 여부
  moveDirection = null, // 이동 방향
}: SortableBookmarkListItemProps) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id });

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

  const handleRefreshFavicon = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (onRefreshFavicon) {
      await onRefreshFavicon(bookmark);
    }
  };

  const collection = collections.find((col) => col.id === bookmark.collection);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 overflow-hidden min-w-0 backdrop-blur-sm ${
        isDragging ? "opacity-50 shadow-2xl z-50" : ""
      } hover:z-30 z-10 ${
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
          className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-50 ${
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
      <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* 드래그 핸들러 - 데스크톱에서만 호버 시 표시 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 hidden sm:flex opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-grab active:cursor-grabbing z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm min-w-[36px] min-h-[36px] items-center justify-center"
      >
        <svg
          className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        </svg>
      </div>

      {/* 액션 버튼들 - 모바일에서 개선된 레이아웃 */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col sm:flex-row gap-1.5 sm:gap-1.5 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300">
        {/* 상하 이동 버튼들 - 모바일에서 세로 배치 */}
        <div className="flex flex-col sm:hidden gap-1">
          <button
            onClick={handleMoveUp}
            disabled={isFirst}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-2 text-gray-700 hover:text-green-600 dark:text-gray-200 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-2 text-gray-700 hover:text-green-600 dark:text-gray-200 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
        </div>

        {/* 주요 액션 버튼들 - 모바일에서 세로 배치 */}
        <div className="flex flex-col sm:flex-row gap-1">
          {/* 수정 버튼 */}
          <button
            onClick={handleEdit}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-2 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
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
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className={`p-2 rounded-lg transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation ${
              bookmark.isFavorite
                ? "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            }`}
            title={
              bookmark.isFavorite
                ? t("bookmarks.removeFromFavorites")
                : t("bookmarks.addToFavorites")
            }
          >
            <svg
              className={`w-4 h-4 ${
                bookmark.isFavorite
                  ? "text-red-500 dark:text-red-400"
                  : "text-gray-500"
              }`}
              fill={bookmark.isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>

          {/* 삭제 버튼 */}
          <button
            onClick={handleDelete}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 touch-manipulation"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 리스트 아이템 내용 - 모바일에서 개선된 레이아웃 */}
      <div className="p-4 sm:p-6 pt-20 sm:pt-14 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-y-3 sm:space-x-5">
          {/* 파비콘 - 모바일에서 위쪽 */}
          <div className="flex-shrink-0 flex justify-center sm:block mb-2 sm:mb-0">
            <div className="relative w-12 h-12 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-900/30 dark:to-accent-900/30 flex items-center justify-center shadow-sm">
              {bookmark.favicon ? (
                <div
                  className="relative w-8 h-8 sm:w-8 sm:h-8 rounded-lg overflow-hidden hover:scale-110 transition-all duration-200 cursor-pointer [&:hover_>_.overlay]:opacity-100"
                  onClick={handleRefreshFavicon}
                  title={t("common.refreshFavicon")}
                >
                  <img
                    src={bookmark.favicon}
                    alt={t("common.favicon")}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {/* 호버 오버레이 - 새로고침 아이콘 */}
                  {onRefreshFavicon && (
                    <div className="overlay absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 transition-all duration-200 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-white"
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
                  )}
                </div>
              ) : (
                <div
                  className="relative w-6 h-6 sm:w-6 sm:h-6 hover:scale-110 transition-all duration-200 cursor-pointer [&:hover_>_.overlay]:opacity-100"
                  onClick={handleRefreshFavicon}
                  title={t("common.refreshFavicon")}
                >
                  <svg
                    className="w-full h-full text-gray-500 dark:text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  {/* 호버 오버레이 - 새로고침 아이콘 */}
                  {onRefreshFavicon && (
                    <div className="overlay absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 transition-all duration-200 pointer-events-none">
                      <svg
                        className="w-3 h-3 text-white"
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
                  )}
                </div>
              )}

              {/* 로딩 오버레이 */}
              {faviconLoading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>

          {/* 텍스트 및 정보 영역 - 수직 배치 */}
          <div className="flex-1 min-w-0 flex flex-col gap-y-2">
            <div className="flex items-center space-x-3 mb-1">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg sm:text-lg font-semibold text-gray-900 dark:text-white truncate hover:text-brand-600 dark:hover:text-brand-400 transition-colors duration-200 cursor-pointer"
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
                <span className="inline-flex items-center gap-1 px-3 py-2 sm:px-3 sm:py-1.5 rounded-full text-sm sm:text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm">
                  {renderCollectionIcon(collection.icon, "w-4 h-4")}{" "}
                  {collection.name}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-2 sm:px-3 sm:py-1.5 rounded-full text-sm sm:text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 shadow-sm">
                  {t("collections.noCollection")}
                </span>
              )}
              <div className="text-sm sm:text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-2 sm:px-2 sm:py-1 rounded-md">
                {bookmark.createdAt.toLocaleDateString()}
              </div>
            </div>
            {bookmark.description && (
              <p className="text-sm sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 transition-colors duration-200 leading-relaxed">
                {bookmark.description}
              </p>
            )}
          </div>
        </div>
        {/* 방문하기 버튼: 모바일에서 전체 너비, 데스크톱은 우측 정렬 */}
        <div className="flex mt-4 sm:justify-end">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full sm:w-auto space-x-2 px-4 py-3 sm:px-4 sm:py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/30 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md active:scale-95 min-h-[44px] sm:min-h-[36px]"
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
