import React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ArrowUpDown, Check } from "lucide-react";
import type { SortOption } from "../../types";
import { useTranslation } from "react-i18next";

interface BookmarkSortProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const BookmarkSort: React.FC<BookmarkSortProps> = ({
  currentSort,
  onSortChange,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const sortOptions: SortOption[] = [
    { field: "order",      direction: "asc",  label: t("bookmarks.sortByUserOrder") },
    { field: "title",      direction: "asc",  label: t("bookmarks.sortByTitleAZ") },
    { field: "title",      direction: "desc", label: t("bookmarks.sortByTitleZA") },
    { field: "url",        direction: "asc",  label: t("bookmarks.sortByUrlAZ") },
    { field: "url",        direction: "desc", label: t("bookmarks.sortByUrlZA") },
    { field: "createdAt",  direction: "desc", label: t("bookmarks.sortByNewest") },
    { field: "createdAt",  direction: "asc",  label: t("bookmarks.sortByOldest") },
    { field: "updatedAt",  direction: "desc", label: t("bookmarks.sortByRecentlyModified") },
    { field: "updatedAt",  direction: "asc",  label: t("bookmarks.sortByOldestModified") },
    { field: "isFavorite", direction: "desc", label: t("bookmarks.sortByFavorite") },
  ];

  const currentLabel =
    sortOptions.find(
      (o) => o.field === currentSort.field && o.direction === currentSort.direction
    )?.label || t("bookmarks.sort");

  const isActive = (o: SortOption) =>
    o.field === currentSort.field && o.direction === currentSort.direction;

  const handleSelect = (option: SortOption) => {
    onSortChange(option);
    setIsOpen(false);
  };

  return (
    <>
      {/* 트리거 버튼 */}
      <div className="relative z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.08] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="max-w-[72px] sm:max-w-none truncate text-xs sm:text-sm">{currentLabel}</span>
          <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* 데스크톱 드롭다운 */}
        {isOpen && (
          <div className="hidden sm:block absolute right-0 mt-1.5 w-52 bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/[0.08] rounded-2xl shadow-xl z-40 overflow-hidden py-1">
            {sortOptions.map((option) => (
              <button
                key={`${option.field}-${option.direction}`}
                onClick={() => handleSelect(option)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors ${
                  isActive(option)
                    ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                }`}
              >
                {option.label}
                {isActive(option) && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 모바일 바텀시트 — Portal로 body에 직접 렌더링 */}
      {isOpen && createPortal(
        <div className="sm:hidden fixed inset-0 z-[99999] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111113] rounded-t-2xl overflow-hidden border-t border-gray-100 dark:border-white/[0.06]">
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 bg-gray-200 dark:bg-white/[0.12] rounded-full" />
            </div>

            {/* 제목 */}
            <div className="px-5 py-2 border-b border-gray-50 dark:border-white/[0.04]">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {t("bookmarks.sort")}
              </p>
            </div>

            {/* 옵션 목록 */}
            <div className="px-2 py-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
              {sortOptions.map((option) => (
                <button
                  key={`${option.field}-${option.direction}`}
                  onClick={() => handleSelect(option)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                    isActive(option)
                      ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      : "text-gray-700 dark:text-gray-300 active:bg-gray-50 dark:active:bg-white/[0.04]"
                  }`}
                >
                  {option.label}
                  {isActive(option) && (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* 취소 버튼 */}
            <div className="px-4 pt-1 pb-6">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] active:bg-gray-200 dark:active:bg-white/[0.10] transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 데스크톱 백드롭 */}
      {isOpen && (
        <div className="hidden sm:block fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};
