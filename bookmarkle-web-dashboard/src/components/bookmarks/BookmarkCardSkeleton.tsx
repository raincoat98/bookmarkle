import React from "react";

export const BookmarkCardSkeleton: React.FC = () => {
  return (
    <div className="relative bg-gradient-to-br from-white to-gray-50/60 dark:bg-[#111113] dark:bg-none border border-gray-200/60 dark:border-white/[0.06] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-none rounded-xl overflow-hidden w-full">
      {/* 다크모드 그라데이션 오버레이 */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block bg-gradient-to-br from-white/[0.015] via-transparent to-violet-500/[0.06] rounded-xl" />

      {/* 상단 액션바 */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-gray-100 dark:border-white/[0.04]">
        <div className="w-4 h-4 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
          <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
          <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
        </div>
      </div>

      {/* 카드 본문 */}
      <div className="p-3">
        <div className="flex gap-3">
          {/* 파비콘 */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/[0.06] animate-pulse" />

          {/* 텍스트 */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse w-4/5" />
            <div className="h-3 bg-gray-100 dark:bg-white/[0.04] rounded animate-pulse w-full" />
            <div className="flex items-center gap-1.5 mt-1">
              <div className="h-5 w-16 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
              <div className="h-3 w-20 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
