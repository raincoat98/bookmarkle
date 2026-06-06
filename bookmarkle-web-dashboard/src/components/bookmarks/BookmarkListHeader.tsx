import React from "react";
import { BookmarkSort } from "./BookmarkSort";
import type { SortOption } from "../../types";
import { useTranslation } from "react-i18next";
import { Pencil, X } from "lucide-react";

interface BookmarkListHeaderProps {
  totalCount: number;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  loading?: boolean;
  rightContent?: React.ReactNode;
  collectionLabel?: string;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
}

export const BookmarkListHeader: React.FC<BookmarkListHeaderProps> = ({
  totalCount,
  currentSort,
  onSortChange,
  loading = false,
  rightContent,
  collectionLabel,
  isEditMode = false,
  onToggleEditMode,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-between items-center relative z-40">
        <div className="h-5 bg-gray-200 dark:bg-white/[0.08] rounded w-32 animate-pulse"></div>
        <div className="flex items-center gap-2 sm:gap-3">
          {rightContent}
          <div className="h-9 bg-gray-200 dark:bg-white/[0.08] rounded-lg w-40 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center relative z-40">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span>{t("bookmarks.totalBookmarks", { count: totalCount })}</span>
        {collectionLabel && (
          <>
            <span className="text-gray-300 dark:text-white/20">·</span>
            <span className="font-medium text-violet-600 dark:text-violet-400">
              {collectionLabel}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {rightContent}
        {/* 모바일 편집 모드 버튼 */}
        {onToggleEditMode && (
          <button
            onClick={onToggleEditMode}
            className={`sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors touch-manipulation ${
              isEditMode
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white dark:bg-[#111113] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            {isEditMode ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {isEditMode ? t("common.done") : t("common.edit")}
          </button>
        )}
        <BookmarkSort currentSort={currentSort} onSortChange={onSortChange} />
      </div>
    </div>
  );
};
