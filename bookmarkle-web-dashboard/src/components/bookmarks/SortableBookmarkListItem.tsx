import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { Globe, ChevronRight } from "lucide-react";
import type { Bookmark, Collection } from "../../types";
import { renderCollectionIcon } from "../../utils/iconRenderer";
import { buildCollectionPath } from "../../utils/collectionPath";
import { useTranslation } from "react-i18next";


interface SortableBookmarkListItemProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  collections: Collection[];
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onRefreshFavicon?: (bookmark: Bookmark) => Promise<void>;
  faviconLoading?: boolean;
}

export const SortableBookmarkListItem = ({
  bookmark,
  onEdit,
  onDelete,
  collections,
  onToggleFavorite,
  faviconLoading = false,
}: SortableBookmarkListItemProps) => {
  const { t } = useTranslation();
  const [faviconError, setFaviconError] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id });

  const style = useMemo(
    () => ({ transform: CSS.Transform.toString(transform), transition }),
    [transform, transition]
  );

  const collectionPath = useMemo(
    () => buildCollectionPath(bookmark.collection, collections),
    [collections, bookmark.collection]
  );

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-gradient-to-r from-white to-gray-50/40 dark:bg-[#111113] dark:bg-none border border-gray-200/60 dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none rounded-xl transition-all duration-200 overflow-hidden hover:shadow-[0_4px_14px_rgba(0,0,0,0.07),0_0_0_1px_rgba(139,92,246,0.15)] hover:border-violet-200/50 dark:hover:shadow-none dark:hover:border-white/[0.10] ${
        isDragging ? "opacity-40 shadow-2xl scale-[1.01]" : ""
      }`}
    >
      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1/2 -translate-y-1/2 left-3 hidden sm:flex cursor-grab active:cursor-grabbing z-10 p-1 rounded text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        </svg>
      </div>

      {/* 액션 버튼들 */}
      <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-0.5 z-10">
        <button
          onClick={(e) => { stop(e); onToggleFavorite(bookmark.id, !bookmark.isFavorite); }}
          className={`p-1.5 rounded-lg transition-colors duration-150 ${
            bookmark.isFavorite
              ? "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              : "text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          }`}
          title={t("bookmarks.isFavorite")}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
          </svg>
        </button>
        <button
          onClick={(e) => { stop(e); onEdit(bookmark); }}
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150"
          title={t("common.edit")}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" />
          </svg>
        </button>
        <button
          onClick={(e) => { stop(e); onDelete(bookmark); }}
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150"
          title={t("common.delete")}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 리스트 아이템 본문 */}
      <div className="flex items-center gap-3 px-4 py-3 sm:pl-10 pr-28">
        {/* 파비콘 */}
        <div className="relative flex-shrink-0">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { if (isDragging) { e.preventDefault(); e.stopPropagation(); } }}
            className="block"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-violet-500/50 transition-all duration-150 flex-shrink-0">
              {bookmark.favicon && !faviconError ? (
                <img
                  src={bookmark.favicon}
                  alt={t("common.favicon")}
                  className="w-5 h-5 rounded"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>
          </a>
          {faviconLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/40 rounded-lg">
              <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { if (isDragging) { e.preventDefault(); e.stopPropagation(); } }}
              className={`text-sm font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-150 ${
                isDragging ? "pointer-events-none" : ""
              }`}
              title={bookmark.title}
            >
              {bookmark.title}
            </a>
            {bookmark.isFavorite && (
              <span className="flex-shrink-0">
                <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 min-w-0 flex-wrap">
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px] sm:max-w-[300px]">
              {bookmark.url}
            </p>
            {collectionPath.length > 0 ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 flex-shrink-0 max-w-[160px] overflow-hidden">
                {collectionPath.map((col, idx) => (
                  <span key={col.id} className="inline-flex items-center gap-0.5 min-w-0">
                    {idx > 0 && (
                      <ChevronRight className="w-2.5 h-2.5 text-violet-400/60 dark:text-violet-500/60 flex-shrink-0" />
                    )}
                    <span className={`inline-flex items-center gap-0.5 ${idx < collectionPath.length - 1 ? "text-violet-400/70 dark:text-violet-500/60" : ""}`}>
                      {renderCollectionIcon(col.icon, "w-3 h-3 flex-shrink-0")}
                      <span className="truncate max-w-[60px]">{col.name}</span>
                    </span>
                  </span>
                ))}
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-gray-500 flex-shrink-0">
                {t("collections.noCollection")}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-600 flex-shrink-0 hidden sm:inline">
              {bookmark.createdAt.toLocaleDateString()}
            </span>
            {bookmark.tags && bookmark.tags.map((tag: string) => (
              <span
                key={tag}
                className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 flex-shrink-0"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
