import React from "react";
import { Search, Grid3X3, List, Plus, FolderPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BookmarksTopBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onAddCollection: () => void;
  onAddBookmark: () => void;
}

export const BookmarksTopBar: React.FC<BookmarksTopBarProps> = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onAddCollection,
  onAddBookmark,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex-shrink-0 sticky top-0 z-50 min-h-[80px] sm:h-[80px] px-4 lg:px-6 py-3 sm:py-0 border-b border-gray-200 dark:border-white/[0.06] bg-white/95 dark:bg-[#111113]/95 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full h-full sm:items-center">
        <div className="relative w-full sm:flex-1 min-w-0">
          <input
            type="text"
            placeholder={t("bookmarks.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 h-[38px] rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm border-0"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
        </div>

        {/* 데스크톱 컨트롤 */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-white/[0.06] rounded-lg p-1 h-[44px]">
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-md transition-all duration-200 min-w-[36px] h-full flex items-center justify-center ${
                viewMode === "grid"
                  ? "bg-white dark:bg-white/[0.12] text-violet-600 dark:text-violet-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title={t("bookmarks.gridView")}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`p-1.5 rounded-md transition-all duration-200 min-w-[36px] h-full flex items-center justify-center ${
                viewMode === "list"
                  ? "bg-white dark:bg-white/[0.12] text-violet-600 dark:text-violet-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title={t("bookmarks.listView")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddCollection}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 h-[40px] border border-violet-300 dark:border-violet-600/60 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              title={t("collections.addCollection")}
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden lg:inline">{t("collections.addCollection")}</span>
            </button>
            <button
              onClick={onAddBookmark}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 h-[40px] bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-violet-500/25 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t("bookmarks.addBookmark")}
            </button>
          </div>
        </div>

        {/* 모바일 버튼들 */}
        <div className="flex gap-2 sm:hidden">
          <button
            onClick={onAddCollection}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 h-[38px] border border-violet-300 dark:border-violet-600/60 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 text-xs font-medium rounded-lg transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>{t("collections.addCollection")}</span>
          </button>
          <button
            onClick={onAddBookmark}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 h-[38px] bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("bookmarks.addBookmark")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
