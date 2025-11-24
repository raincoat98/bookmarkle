import React from "react";

export const BookmarkCardSkeleton: React.FC = () => {
  return (
    <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 animate-pulse w-full min-w-0 max-w-full box-border overflow-hidden backdrop-blur-sm">
      {/* 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-accent-500/5 opacity-0" />
      
      {/* 액션 버튼들 - 모바일에서 항상 보이도록 */}
      <div className="absolute top-2 right-2 flex flex-wrap gap-1 z-30 w-full max-w-full overflow-x-auto justify-end opacity-100 sm:opacity-0 transition-all duration-300">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>

      {/* 카드 내용 - 모바일에서 수직 배치 */}
      <div className="p-4 sm:p-5 lg:p-5 pt-20 sm:pt-16 lg:pt-16 relative z-10 pointer-events-none">
        <div className="flex flex-col sm:flex-row sm:items-start gap-y-2.5 sm:gap-y-3 sm:space-x-3 lg:space-x-4 pointer-events-auto">
          {/* 파비콘 - 모바일에서 위쪽 */}
          <div className="relative flex-shrink-0 flex justify-center sm:block mb-2 sm:mb-0">
            <div className="w-11 h-11 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-900/30 dark:to-accent-900/30 flex items-center justify-center shadow-sm">
              <div className="w-7 h-7 sm:w-6 sm:h-6 lg:w-8 lg:h-8 rounded-lg bg-gray-300 dark:bg-gray-600"></div>
            </div>
          </div>

          {/* 텍스트 및 정보 영역 - 수직 배치 */}
          <div className="flex-1 min-w-0 flex flex-col gap-y-1.5 sm:gap-y-2">
            {/* 제목 */}
            <div className="h-5 sm:h-5 lg:h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            {/* URL */}
            <div className="h-3 sm:h-3 lg:h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            {/* 컬렉션 및 날짜 */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
              <div className="h-6 sm:h-5 lg:h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
              <div className="h-5 sm:h-4 lg:h-5 bg-gray-300 dark:bg-gray-600 rounded-md w-24"></div>
            </div>
          </div>
        </div>

        {/* 방문하기 버튼: 모바일에서 전체 너비, 데스크톱은 우측 정렬 */}
        <div className="flex mt-3 sm:mt-4 lg:mt-4 sm:justify-end relative z-30 pointer-events-auto">
          <div className="h-10 sm:h-8 lg:h-9 bg-gray-300 dark:bg-gray-600 rounded-lg w-full sm:w-24"></div>
        </div>
      </div>
    </div>
  );
};
