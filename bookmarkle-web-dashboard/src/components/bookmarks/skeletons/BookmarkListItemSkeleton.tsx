import React from "react";

export const BookmarkListItemSkeleton: React.FC = () => {
  return (
    <div className="relative bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden min-w-0">
      {/* 다크모드 그라데이션 오버레이 */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-gradient-to-r from-transparent to-violet-500/[0.04] rounded-xl" />

      <div className="flex items-center gap-3 px-4 py-3 relative">
        {/* 드래그 핸들 */}
        <div className="w-4 h-4 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse flex-shrink-0" />

        {/* 파비콘 */}
        <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-white/[0.06] animate-pulse flex-shrink-0" />

        {/* 텍스트 */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="h-4 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse w-2/5" />
          <div className="h-3 bg-gray-100 dark:bg-white/[0.04] rounded animate-pulse w-3/5" />
        </div>

        {/* 배지 + 날짜 */}
        <div className="flex-shrink-0 hidden sm:flex items-center gap-2">
          <div className="h-5 w-16 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-20 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
        </div>

        {/* 액션 버튼들 */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
          <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
          <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    </div>
  );
};
