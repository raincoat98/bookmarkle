import React, { useMemo, useState, useEffect, useRef } from "react";
import { Edit, Trash2, Heart, Sparkles, Clock, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Bookmark, Collection } from "../../types";

// ─── FaviconDisplay ────────────────────────────────────────────────────────────

const FaviconDisplay: React.FC<{ bookmark: Bookmark; fallback: React.ReactNode }> = ({ bookmark, fallback }) => {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [bookmark.id, bookmark.favicon]);
  if (!bookmark.favicon || err) return <>{fallback}</>;
  return <img src={bookmark.favicon} alt={bookmark.title} className="w-full h-full object-cover" onError={() => setErr(true)} />;
};

// ─── Sort helpers ───────────────────────────────────────────────────────────────

type FavSort = "order" | "newest" | "az";
type RecentSort = "newest" | "oldest" | "modified";

const FAV_SORT_LABELS: Record<FavSort, string> = {
  order: "순서",
  newest: "최신",
  az: "A-Z",
};
const RECENT_SORT_LABELS: Record<RecentSort, string> = {
  newest: "최신",
  oldest: "오래된",
  modified: "수정",
};
const FAV_SORTS: FavSort[] = ["order", "newest", "az"];
const RECENT_SORTS: RecentSort[] = ["newest", "oldest", "modified"];

// ─── BookmarkIcon ───────────────────────────────────────────────────────────────

interface BookmarkIconProps {
  bookmark: Bookmark;
  showDate?: boolean;
  showActionsMobile?: boolean;
  onOpen: (url: string) => void;
  onFavorite: (id: string, val: boolean) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  stopAndMark: (e: React.SyntheticEvent) => void;
}

const BookmarkIcon: React.FC<BookmarkIconProps> = ({
  bookmark, showDate, showActionsMobile, onOpen, onFavorite, onEdit, onDelete, stopAndMark,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="group/icon relative flex flex-col items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer w-[68px] sm:w-[76px] flex-shrink-0 select-none"
      onClick={() => onOpen(bookmark.url)}
    >
      {/* 아이콘 */}
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden mb-1.5 shadow-sm border border-gray-100 dark:border-white/[0.06]">
        <FaviconDisplay
          bookmark={bookmark}
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-white/[0.08]">
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
          }
        />

        {/* 호버 액션 오버레이 (데스크톱) */}
        <div className="absolute inset-0 bg-black/50 hidden sm:flex items-center justify-center gap-1 opacity-0 group-hover/icon:opacity-100 transition-opacity rounded-xl">
          <button
            onClick={(e) => { stopAndMark(e); onEdit(bookmark); }}
            onMouseDown={stopAndMark}
            className="p-1 rounded-lg bg-white/20 hover:bg-white/40 transition-colors"
            title={t("common.edit")}
          >
            <Edit className="w-3 h-3 text-white pointer-events-none" />
          </button>
          <button
            onClick={(e) => { stopAndMark(e); onDelete(bookmark.id); }}
            onMouseDown={stopAndMark}
            className="p-1 rounded-lg bg-white/20 hover:bg-red-500/70 transition-colors"
            title={t("common.delete")}
          >
            <Trash2 className="w-3 h-3 text-white pointer-events-none" />
          </button>
        </div>
      </div>

      {/* 즐겨찾기 버튼 (항상 표시 — 미즐겨찾기는 약한 톤, 호버 시 진해짐) */}
      <button
        onClick={(e) => { stopAndMark(e); onFavorite(bookmark.id, !bookmark.isFavorite); }}
        onMouseDown={stopAndMark}
        className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow border-2 border-white dark:border-[#111113] transition-all touch-manipulation ${
          bookmark.isFavorite
            ? "bg-red-500 opacity-100"
            : "bg-white dark:bg-white/[0.1] opacity-60 group-hover/icon:opacity-100"
        }`}
        title={bookmark.isFavorite ? t("bookmarks.removeFromFavorites") : t("bookmarks.addToFavorites")}
      >
        <Heart className={`w-2.5 h-2.5 pointer-events-none ${bookmark.isFavorite ? "text-white fill-white" : "text-gray-400 dark:text-gray-300"}`} />
      </button>

      {/* 제목 */}
      <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center truncate w-full leading-tight" title={bookmark.title}>
        {bookmark.title}
      </p>
      {showDate && (
        <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
          {formatDate(bookmark.createdAt)}
        </p>
      )}

      {/* 모바일 액션 버튼 (최근추가 섹션에서만) */}
      {showActionsMobile && (
        <div className="flex sm:hidden items-center gap-1 mt-1">
          <button
            onClick={(e) => { stopAndMark(e); onEdit(bookmark); }}
            onMouseDown={stopAndMark}
            className="p-1 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 active:bg-gray-200 touch-manipulation"
          >
            <Edit className="w-2.5 h-2.5 pointer-events-none" />
          </button>
          <button
            onClick={(e) => { stopAndMark(e); onDelete(bookmark.id); }}
            onMouseDown={stopAndMark}
            className="p-1 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-red-400 active:bg-red-50 touch-manipulation"
          >
            <Trash2 className="w-2.5 h-2.5 pointer-events-none" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── formatDate (module-level) ─────────────────────────────────────────────────

function formatDate(date: Date): string {
  const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return new Date(date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ─── BookmarksWidget ────────────────────────────────────────────────────────────

interface BookmarksWidgetProps {
  bookmarks: Bookmark[];
  collections: Collection[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  loading?: boolean;
  isEditMode?: boolean;
  swapped?: boolean;
  onSwap?: () => void;
}

export const BookmarksWidget: React.FC<BookmarksWidgetProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onToggleFavorite,
  loading = false,
  isEditMode = false,
  swapped = false,
  onSwap: _onSwap,
}) => {
  const { t } = useTranslation();
  const buttonClickedRef = useRef(false);

  const [favSort, setFavSort] = useState<FavSort>("order");
  const [recentSort, setRecentSort] = useState<RecentSort>("newest");

  const cycleFavSort = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = FAV_SORTS.indexOf(favSort);
    setFavSort(FAV_SORTS[(idx + 1) % FAV_SORTS.length]);
  };

  const cycleRecentSort = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = RECENT_SORTS.indexOf(recentSort);
    setRecentSort(RECENT_SORTS[(idx + 1) % RECENT_SORTS.length]);
  };

  const favoriteBookmarks = useMemo(() => {
    if (loading) return [];
    const favs = bookmarks.filter((b) => b.isFavorite);
    if (favSort === "order") favs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    else if (favSort === "newest") favs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else favs.sort((a, b) => a.title.localeCompare(b.title));
    return favs.slice(0, 10);
  }, [bookmarks, loading, favSort]);

  const recentBookmarks = useMemo(() => {
    if (loading) return [];
    const all = [...bookmarks];
    if (recentSort === "newest") all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (recentSort === "oldest") all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else all.sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
    return all.slice(0, 8);
  }, [bookmarks, loading, recentSort]);

  const stopAndMark = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    buttonClickedRef.current = true;
  };

  const handleOpen = (url: string) => {
    if (!buttonClickedRef.current) window.open(url, "_blank");
    setTimeout(() => { buttonClickedRef.current = false; }, 100);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111113] rounded-xl border border-gray-200/80 dark:border-white/[0.06] p-4 sm:p-5 h-full flex items-center justify-center">
        <span className="text-sm text-gray-400">{t("common.loading")}</span>
      </div>
    );
  }

  const iconProps = { onOpen: handleOpen, onFavorite: onToggleFavorite, onEdit, onDelete, stopAndMark };

  const renderFavPanel = (isLeft: boolean) => (
    <div className={`flex flex-col ${isLeft ? "lg:pr-4" : "lg:pl-4"}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          {t("bookmarks.favorites")}
        </h4>
        <button
          onClick={cycleFavSort}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <ArrowUpDown className="w-2.5 h-2.5" />
          {FAV_SORT_LABELS[favSort]}
        </button>
      </div>
      {favoriteBookmarks.length > 0 ? (
        <div className="flex flex-wrap gap-0.5">
          {favoriteBookmarks.map((b) => (
            <BookmarkIcon key={b.id} bookmark={b} showActionsMobile={isEditMode} {...iconProps} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("bookmarks.noFavorites")}</p>
        </div>
      )}
    </div>
  );

  const renderRecentPanel = (isLeft: boolean) => (
    <div className={`flex flex-col ${isLeft ? "lg:pr-4" : "lg:pl-4"}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          {t("bookmarks.recentlyAdded")}
        </h4>
        <button
          onClick={cycleRecentSort}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <ArrowUpDown className="w-2.5 h-2.5" />
          {RECENT_SORT_LABELS[recentSort]}
        </button>
      </div>
      {recentBookmarks.length > 0 ? (
        <div className="flex flex-wrap gap-0.5">
          {recentBookmarks.map((b) => (
            <BookmarkIcon key={b.id} bookmark={b} showDate showActionsMobile={isEditMode} {...iconProps} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("bookmarks.noRecentBookmarks")}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-[#111113] rounded-xl border border-gray-200/80 dark:border-white/[0.06] p-4 sm:p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
        <Heart className="w-4 h-4 text-red-400" />
        {t("bookmarks.title")}
      </h3>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-0 lg:divide-x lg:divide-gray-100 dark:divide-white/[0.06]">
        {swapped ? renderRecentPanel(true) : renderFavPanel(true)}
        {swapped ? renderFavPanel(false) : renderRecentPanel(false)}
      </div>
    </div>
  );
};
