import React from "react";

export const BookmarkListItemSkeleton: React.FC = () => {
  return (
    <div className="group relative bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 animate-pulse overflow-hidden min-w-0 backdrop-blur-sm">
      {/* 상단 액션 버튼 영역 */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col sm:flex-row gap-1.5 sm:gap-1.5 z-30">
        <div className="flex flex-col sm:hidden gap-1">
          <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-1">
          <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>

      {/* 리스트 아이템 내용 */}
      <div className="p-4 sm:p-6 pt-20 sm:pt-14 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-y-3 sm:space-x-5">
          {/* 파비콘 */}
          <div className="flex-shrink-0 flex justify-center sm:block mb-2 sm:mb-0">
            <div className="w-12 h-12 sm:w-12 sm:h-12 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
          </div>

          {/* 텍스트 및 정보 영역 */}
          <div className="flex-1 min-w-0 flex flex-col gap-y-2">
            {/* 제목 */}
            <div className="h-6 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            {/* URL */}
            <div className="h-4 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            {/* 컬렉션 및 날짜 */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <div className="h-6 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-24"></div>
              <div className="h-5 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-28"></div>
            </div>
            {/* 설명 */}
            <div className="space-y-1">
              <div className="h-4 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
            </div>
          </div>
        </div>

        {/* 방문하기 버튼 */}
        <div className="flex mt-4 sm:justify-end">
          <div className="h-11 sm:h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-full sm:w-28"></div>
        </div>
      </div>
    </div>
  );
};
