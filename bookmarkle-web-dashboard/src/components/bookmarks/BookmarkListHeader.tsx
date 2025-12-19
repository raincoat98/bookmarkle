import React from "react";
import { BookmarkSort } from "./BookmarkSort";
import type { SortOption } from "../../types";
import { useTranslation } from "react-i18next";

interface BookmarkListHeaderProps {
  totalCount: number;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  loading?: boolean;
  rightContent?: React.ReactNode;
}

export const BookmarkListHeader: React.FC<BookmarkListHeaderProps> = ({
  totalCount,
  currentSort,
  onSortChange,
  loading = false,
  rightContent,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-between items-center relative z-40">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        <div className="flex items-center gap-2 sm:gap-3">
          {rightContent}
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-40 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center relative z-40">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {t("bookmarks.totalBookmarks", { count: totalCount })}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {rightContent}
        <BookmarkSort currentSort={currentSort} onSortChange={onSortChange} />
      </div>
    </div>
  );
};
