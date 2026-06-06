import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useRef, useCallback } from "react";
import { Globe, ChevronRight } from "lucide-react";
import type { Bookmark, Collection } from "../../types";
import { renderCollectionIcon } from "../../utils/iconRenderer";
import { useTranslation } from "react-i18next";

function buildCollectionPath(id: string | null | undefined, all: Collection[]): Collection[] {
  const path: Collection[] = [];
  let cur = all.find(c => c.id === id);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? all.find(c => c.id === cur!.parentId) : undefined;
  }
  return path;
}

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
  isMoving?: boolean;
  moveDirection?: "up" | "down" | null;
}

export const SortableBookmarkCard = ({
  bookmark,
  onEdit,
  onDelete,
  faviconLoading,
  collections,
  onToggleFavorite,
  isMoving = false,
}: SortableBookmarkCardProps) => {
  const { t } = useTranslation();
  const [faviconError, setFaviconError] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowMobileActions(true);
      navigator.vibrate?.(30);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);
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

  const collectionPath = buildCollectionPath(bookmark.collection, collections);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`group relative bg-gradient-to-br from-white to-gray-50/60 dark:bg-[#111113] dark:bg-none border border-gray-200/60 dark:border-white/[0.06] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.02)] dark:shadow-none transition-all duration-200 overflow-hidden hover:shadow-[0_6px_20px_rgba(0,0,0,0.08),0_0_0_1px_rgba(139,92,246,0.18)] hover:border-violet-200/50 dark:hover:shadow-none dark:hover:border-white/[0.10] ${
        isDragging ? "opacity-40 scale-[1.02]" : ""
      } ${isMoving ? "ring-2 ring-violet-400 dark:ring-violet-500" : ""}`}
    >
      {/* 모바일 롱프레스 액션 오버레이 */}
      {showMobileActions && (
        <div
          className="absolute inset-0 z-10 bg-black/60 rounded-xl flex items-center justify-center gap-4 animate-in fade-in duration-150"
          onClick={() => setShowMobileActions(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(bookmark); setShowMobileActions(false); }}
            className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-white/10 active:bg-white/20"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" />
            </svg>
            <span className="text-xs text-white font-medium">{t("common.edit")}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(bookmark); setShowMobileActions(false); }}
            className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-red-500/80 active:bg-red-600"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-xs text-white font-medium">{t("common.delete")}</span>
          </button>
        </div>
      )}
      {/* 라이트모드 그라데이션 오버레이 */}
      <div className="pointer-events-none absolute inset-0 block dark:hidden bg-gradient-to-br from-violet-50/10 via-transparent to-indigo-50/15 rounded-xl" />
      {/* 다크모드 그라데이션 오버레이 */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-gradient-to-br from-white/[0.015] via-transparent to-violet-500/[0.06] rounded-xl" />
      {/* 상단 액션바 */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-gray-100/80 dark:border-white/[0.04]">
        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors duration-150"
          title={t("common.drag") ?? "Drag"}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              onToggleFavorite(bookmark.id, !bookmark.isFavorite);
            }}
            className={`p-1.5 rounded-lg transition-colors duration-150 ${
              bookmark.isFavorite
                ? "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                : "text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
            }`}
            title={t("bookmarks.isFavorite")}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          </button>
          <button
            onClick={handleEdit}
            className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150"
            title={t("common.edit")}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-2 sm:p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150 touch-manipulation"
            title={t("common.delete")}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 카드 본문 */}
      <div className="p-3">
        <div className="flex gap-3">
          {/* 파비콘 */}
          <div className="relative flex-shrink-0">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { if (isDragging) { e.preventDefault(); e.stopPropagation(); } }}
              className="block"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/[0.06] border border-gray-100/80 dark:border-transparent flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-violet-500/40 transition-all duration-150">
                {bookmark.favicon && !faviconError ? (
                  <img
                    src={bookmark.favicon}
                    alt={t("common.favicon")}
                    className="w-6 h-6 rounded"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
              </div>
            </a>
            {faviconLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/40 rounded-xl">
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* 텍스트 영역 */}
          <div className="flex-1 min-w-0">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { if (isDragging) { e.preventDefault(); e.stopPropagation(); } }}
              className={`block text-sm font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-150 leading-snug ${
                isDragging ? "pointer-events-none" : ""
              }`}
              title={bookmark.title}
            >
              {bookmark.title}
            </a>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {bookmark.url}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {collectionPath.length > 0 ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 max-w-full overflow-hidden">
                  {collectionPath.map((col, idx) => (
                    <span key={col.id} className="inline-flex items-center gap-0.5 min-w-0">
                      {idx > 0 && (
                        <ChevronRight className="w-2.5 h-2.5 text-violet-400/60 dark:text-violet-500/60 flex-shrink-0" />
                      )}
                      <span className={`inline-flex items-center gap-0.5 ${idx < collectionPath.length - 1 ? "text-violet-400/70 dark:text-violet-500/60" : ""}`}>
                        {renderCollectionIcon(col.icon, "w-3 h-3 flex-shrink-0")}
                        <span className="truncate max-w-[80px]">{col.name}</span>
                      </span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100/80 dark:bg-white/[0.04] text-gray-400 dark:text-gray-500 border border-gray-200/60 dark:border-transparent">
                  {t("collections.noCollection")}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-600">
                {bookmark.createdAt.toLocaleDateString()}
              </span>
            </div>
            {bookmark.tags && bookmark.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {bookmark.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100/70 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-transparent"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {bookmark.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">
                {bookmark.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
