import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Edit, Trash2, Heart, Sparkles, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Bookmark, Collection } from "../../types";

interface BookmarksWidgetProps {
  bookmarks: Bookmark[];
  collections: Collection[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  loading?: boolean;
}

export const BookmarksWidget: React.FC<BookmarksWidgetProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onToggleFavorite,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  // 버튼 클릭 시 카드 클릭 방지를 위한 플래그
  const buttonClickedRef = useRef<boolean>(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const favoriteBookmarks = useMemo(() => {
    if (loading) return [];
    const filtered = bookmarks.filter((b) => b.isFavorite);
    // 즐겨찾기는 사용자가 지정한 순서(order 필드)로 정렬하고 최대 10개만 표시
    return filtered
      .slice()
      .sort((a, b) => {
        // order 필드가 있으면 order로 정렬
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // order가 없는 경우 생성일 기준으로 정렬 (최신순)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 10); // 최대 10개만 표시
  }, [bookmarks, loading]);

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
    return (
      <div className="card-glass p-4 sm:p-6 h-full flex flex-col items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="card-glass p-4 sm:p-6 h-full flex flex-col"
    >
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Heart className="w-4 sm:w-5 h-4 sm:h-5 text-red-500 mr-2 sm:mr-3" />
        </motion.div>
        {t("bookmarks.title")}
      </motion.h3>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="favorites-section group/fav-section flex flex-col bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-3 sm:p-4 border border-yellow-200/50 dark:border-yellow-800/50 hover:shadow-lg transition-all duration-300"
        >
          <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 flex items-center">
            <Sparkles className="w-4 h-4 text-yellow-500 mr-2" />
            {t("bookmarks.favorites")}
          </h4>
          {favoritesToShow.length > 0 ? (
            <div className="flex flex-wrap gap-2 sm:gap-3 lg:grid lg:grid-cols-3 xl:grid-cols-5">
              {favoritesToShow.map((bookmark, index) => {
                return (
                  <motion.div
                    key={bookmark.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
                    whileTap={isMobile ? { scale: 0.95 } : undefined}
                    className="relative flex flex-col items-center p-2 sm:p-3 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 active:bg-white/80 dark:active:bg-gray-700/80 hover:shadow-lg active:shadow-lg transition-all duration-300 bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600/30 w-20 sm:w-24 flex-shrink-0 lg:w-auto cursor-pointer"
                    onClick={() => {
                      // 버튼 클릭이 아닌 경우에만 카드 클릭 처리
                      if (!buttonClickedRef.current) {
                        handleFaviconClick(bookmark.url);
                      }
                      // 다음 클릭을 위해 플래그 리셋 (약간의 지연 후)
                      setTimeout(() => {
                        buttonClickedRef.current = false;
                      }, 100);
                    }}
                  >
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer mb-1 sm:mb-2 relative overflow-hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFaviconClick(bookmark.url);
                      }}
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
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover/fav-section:animate-pulse" />
                      </div>
                    </div>

                    <p
                      className="text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white text-center truncate w-full leading-tight"
                      title={bookmark.title}
                    >
                      {bookmark.title}
                    </p>

                    <div
                      className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 transition-all duration-300 transform ${
                        isMobile
                          ? "opacity-70"
                          : "opacity-0 group-hover/fav-section:opacity-100"
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                          onToggleFavorite(bookmark.id, false);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onPointerDown={(e) => {
                          // 마우스와 터치 이벤트 모두 처리
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onTouchStart={(e) => {
                          // passive 이벤트 리스너 문제 해결
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                        }}
                        className="w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 active:bg-red-600 shadow-lg hover:shadow-xl active:shadow-xl transition-all duration-200 touch-none"
                        title={t("bookmarks.removeFromFavorites")}
                      >
                        <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current pointer-events-none" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center py-8 flex-1 flex flex-col items-center justify-center"
            >
              <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("bookmarks.noFavorites")}
              </p>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="recent-section group/recent-section flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-3 sm:p-4 border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300"
        >
          <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 flex items-center">
            <Globe className="w-4 h-4 text-blue-500 mr-2" />
            {t("bookmarks.recentlyAdded")}
          </h4>
          {recentsToShow.length > 0 ? (
            <div className="flex flex-wrap gap-2 sm:gap-3 lg:grid lg:grid-cols-3 xl:grid-cols-5">
              {recentsToShow.map((bookmark, index) => {
                return (
                  <motion.div
                    key={bookmark.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
                    whileTap={isMobile ? { scale: 0.95 } : undefined}
                    className="relative flex flex-col items-center p-2 sm:p-3 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 active:bg-white/80 dark:active:bg-gray-700/80 hover:shadow-lg active:shadow-lg transition-all duration-300 bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600/30 w-20 sm:w-24 flex-shrink-0 lg:w-auto cursor-pointer"
                    onClick={() => {
                      // 버튼 클릭이 아닌 경우에만 카드 클릭 처리
                      if (!buttonClickedRef.current) {
                        handleFaviconClick(bookmark.url);
                      }
                      // 다음 클릭을 위해 플래그 리셋 (약간의 지연 후)
                      setTimeout(() => {
                        buttonClickedRef.current = false;
                      }, 100);
                    }}
                  >
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer mb-1 sm:mb-2 relative overflow-hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFaviconClick(bookmark.url);
                      }}
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
                        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover/recent-section:animate-pulse" />
                      </div>
                    </div>

                    <p
                      className="text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white text-center truncate w-full leading-tight"
                      title={bookmark.title}
                    >
                      {bookmark.title}
                    </p>

                    <p className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 text-center mt-0.5 sm:mt-1 leading-tight">
                      {formatDate(bookmark.createdAt)}
                    </p>

                    <div
                      className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 transition-all duration-300 transform ${
                        isMobile
                          ? "opacity-70"
                          : "opacity-0 group-hover/recent-section:opacity-100"
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                          onToggleFavorite(bookmark.id, !bookmark.isFavorite);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onPointerDown={(e) => {
                          // 마우스와 터치 이벤트 모두 처리
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onTouchStart={(e) => {
                          // passive 이벤트 리스너 문제 해결
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                        }}
                        className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center hover:bg-yellow-600 active:bg-yellow-600 shadow-lg hover:shadow-xl active:shadow-xl transition-all duration-200 touch-none"
                        title={
                          bookmark.isFavorite
                            ? t("bookmarks.removeFromFavorites")
                            : t("bookmarks.addToFavorites")
                        }
                      >
                        <Heart
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 pointer-events-none ${
                            bookmark.isFavorite ? "fill-current" : ""
                          }`}
                        />
                      </button>
                    </div>

                    <div
                      className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 transition-all duration-300 flex space-x-1.5 sm:space-x-2 ${
                        isMobile
                          ? "hidden"
                          : "opacity-0 group-hover/recent-section:opacity-100"
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                          onEdit(bookmark);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onPointerDown={(e) => {
                          // 마우스와 터치 이벤트 모두 처리
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onTouchStart={(e) => {
                          // passive 이벤트 리스너 문제 해결
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                        }}
                        className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 active:bg-blue-600 shadow-lg hover:shadow-xl active:shadow-xl transition-all duration-200 touch-none"
                        title={t("common.edit")}
                      >
                        <Edit className="w-2 h-2 sm:w-2.5 sm:h-2.5 pointer-events-none" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                          onDelete(bookmark.id);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onPointerDown={(e) => {
                          // 마우스와 터치 이벤트 모두 처리
                          e.preventDefault();
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onTouchStart={(e) => {
                          // passive 이벤트 리스너 문제 해결
                          e.stopPropagation();
                          buttonClickedRef.current = true;
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                        }}
                        className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 active:bg-red-600 shadow-lg hover:shadow-xl active:shadow-xl transition-all duration-200 touch-none"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 pointer-events-none" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-center py-8 flex-1 flex flex-col items-center justify-center"
            >
              <Globe className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("bookmarks.noRecentBookmarks")}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
