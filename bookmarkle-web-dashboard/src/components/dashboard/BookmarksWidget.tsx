import React, { useMemo } from "react";
import { Edit, Trash2, Heart, Sparkles, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Bookmark, Collection, SortOption } from "../../types";
import { sortBookmarks } from "../../utils/sortBookmarks";
import { Skeleton } from "../ui/Skeleton";

interface BookmarksWidgetProps {
  bookmarks: Bookmark[];
  collections: Collection[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  currentSort?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  loading?: boolean;
}

export const BookmarksWidget: React.FC<BookmarksWidgetProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onToggleFavorite,
  currentSort,
  onSortChange,
  loading = false,
}) => {
  const { t } = useTranslation();

  const favoriteBookmarks = useMemo(() => {
    if (loading) return [];
    const filtered = bookmarks.filter((b) => b.isFavorite);
    if (currentSort && onSortChange) {
      return sortBookmarks(filtered, currentSort).slice(0, 6);
    }
    return filtered.slice(0, 6);
  }, [bookmarks, currentSort, onSortChange, loading]);

  const recentBookmarks = useMemo(() => {
    if (loading) return [];
    return bookmarks
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [bookmarks, loading]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("dashboard.today");
    if (diffDays === 1) return t("dashboard.yesterday");
    if (diffDays < 7) return t("dashboard.daysAgo", { count: diffDays });
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  if (loading) {
    const skeletonCards = Array.from({ length: 6 });

    return (
      <div className="card-glass p-4 sm:p-6 h-full flex flex-col min-h-[400px] sm:min-h-[500px]">
        <Skeleton className="h-5 w-32 mb-6" />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="flex flex-col bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-yellow-200/50 dark:border-yellow-800/50">
            <Skeleton className="h-4 w-24 mb-4" />
            <div className="flex flex-wrap gap-3 flex-1">
              {skeletonCards.map((_, idx) => (
                <div
                  key={`bookmarks-favorite-skeleton-${idx}`}
                  className="w-20 h-24 flex flex-col items-center justify-center gap-3 rounded-xl border border-white/40 dark:border-gray-600/40 bg-white/70 dark:bg-gray-800/70"
                >
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-800/50">
            <Skeleton className="h-4 w-28 mb-4" />
            <div className="flex flex-wrap gap-3 flex-1">
              {skeletonCards.map((_, idx) => (
                <div
                  key={`bookmarks-recent-skeleton-${idx}`}
                  className="w-20 h-28 flex flex-col items-center justify-center gap-3 rounded-xl border border-white/40 dark:border-gray-600/40 bg-white/70 dark:bg-gray-800/70"
                >
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const favoritesToShow = favoriteBookmarks;
  const recentsToShow = recentBookmarks;

  const handleFaviconClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="card-glass p-4 sm:p-6 h-full flex flex-col min-h-[400px] sm:min-h-[500px]">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
        <Heart className="w-4 sm:w-5 h-4 sm:h-5 text-red-500 mr-2 sm:mr-3" />
        {t("bookmarks.title")}
      </h3>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="favorites-section group/fav-section flex flex-col bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-yellow-200/50 dark:border-yellow-800/50 hover:shadow-lg transition-all duration-300">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <Sparkles className="w-4 h-4 text-yellow-500 mr-2" />
            {t("bookmarks.favorites")}
          </h4>
          {favoritesToShow.length > 0 ? (
            <div className="flex flex-wrap gap-3 flex-1">
              {favoritesToShow.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="relative flex flex-col items-center p-3 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-lg hover:scale-105 transition-all duration-300 w-20 h-24 flex-shrink-0 bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600/30"
                >
                  <div
                    className="w-10 h-10 rounded-lg shadow-lg hover:shadow-xl group-hover/fav-section:scale-110 transition-all duration-300 cursor-pointer mb-2 relative overflow-hidden"
                    onClick={() => handleFaviconClick(bookmark.url)}
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${
                        new URL(bookmark.url).hostname
                      }&sz=32`}
                      alt={bookmark.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback =
                          target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <div
                      className="w-full h-full flex items-center justify-center bg-gradient-to-r from-yellow-400 to-orange-500"
                      style={{ display: "none" }}
                    >
                      <Sparkles className="w-5 h-5 text-white group-hover/fav-section:animate-pulse" />
                    </div>
                  </div>

                  <p
                    className="text-xs font-medium text-gray-900 dark:text-white text-center truncate w-full"
                    title={bookmark.title}
                  >
                    {bookmark.title}
                  </p>

                  <div className="absolute -top-2 -right-2 opacity-0 group-hover/fav-section:opacity-100 transition-all duration-300 transform group-hover/fav-section:scale-110">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(bookmark.id, false);
                      }}
                      className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("bookmarks.removeFromFavorites")}
                    >
                      <Heart className="w-3 h-3 fill-current" />
                    </button>
                  </div>

                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/fav-section:opacity-100 transition-all duration-300 flex space-x-2 group-hover/fav-section:scale-105">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(bookmark);
                      }}
                      className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("common.edit")}
                    >
                      <Edit className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(bookmark.id);
                      }}
                      className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
              <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("bookmarks.noFavorites")}
              </p>
            </div>
          )}
        </div>

        <div className="recent-section group/recent-section flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <Globe className="w-4 h-4 text-blue-500 mr-2" />
            {t("bookmarks.recentlyAdded")}
          </h4>
          {recentsToShow.length > 0 ? (
            <div className="flex flex-wrap gap-3 flex-1">
              {recentsToShow.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="relative flex flex-col items-center p-3 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-lg hover:scale-105 transition-all duration-300 w-20 h-28 flex-shrink-0 bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600/30"
                >
                  <div
                    className="w-10 h-10 rounded-lg shadow-lg hover:shadow-xl group-hover/recent-section:scale-110 transition-all duration-300 cursor-pointer mb-2 relative overflow-hidden"
                    onClick={() => handleFaviconClick(bookmark.url)}
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${
                        new URL(bookmark.url).hostname
                      }&sz=32`}
                      alt={bookmark.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback =
                          target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <div
                      className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ display: "none" }}
                    >
                      <Globe className="w-5 h-5 text-white group-hover/recent-section:animate-pulse" />
                    </div>
                  </div>

                  <p
                    className="text-xs font-medium text-gray-900 dark:text-white text-center truncate w-full"
                    title={bookmark.title}
                  >
                    {bookmark.title}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {formatDate(bookmark.createdAt)}
                  </p>

                  <div className="absolute -top-2 -right-2 opacity-0 group-hover/recent-section:opacity-100 transition-all duration-300 transform group-hover/recent-section:scale-110">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(bookmark.id, !bookmark.isFavorite);
                      }}
                      className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center hover:bg-yellow-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={
                        bookmark.isFavorite
                          ? t("bookmarks.removeFromFavorites")
                          : t("bookmarks.addToFavorites")
                      }
                    >
                      <Heart
                        className={`w-3 h-3 ${
                          bookmark.isFavorite ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/recent-section:opacity-100 transition-all duration-300 flex space-x-2 group-hover/recent-section:scale-105">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(bookmark);
                      }}
                      className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("common.edit")}
                    >
                      <Edit className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(bookmark.id);
                      }}
                      className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
              <Globe className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("bookmarks.noRecentBookmarks")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
