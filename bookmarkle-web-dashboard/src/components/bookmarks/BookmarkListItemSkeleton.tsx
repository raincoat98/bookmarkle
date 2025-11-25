import React from "react";

export const BookmarkListItemSkeleton: React.FC = () => {
  return (
    <div className="group relative bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 animate-pulse overflow-hidden min-w-0 backdrop-blur-sm">
      {/* 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* 리스트 아이템 내용 - 한 줄 레이아웃 */}
      <div className="p-4 sm:p-6 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* 드래그 핸들러 - 왼쪽에 항상 표시 */}
          <div className="flex-shrink-0 p-1.5 rounded-lg">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>

          {/* 파비콘 */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
          </div>

          {/* 제목 및 URL - 세로 배치 */}
          <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden">
            {/* 제목 */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative flex-shrink-0 min-w-[80px] md:min-w-[140px] max-w-[200px] md:max-w-[400px]">
                <div className="h-4 md:h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 md:w-32"></div>
              </div>
            </div>
            {/* 태그 배지 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-12"></div>
            </div>
            {/* URL */}
            <div className="relative flex-1 min-w-0 hidden sm:block">
              <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          </div>

          {/* 컬렉션 정보 및 날짜 */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {/* 컬렉션 태그 */}
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
            {/* 날짜 */}
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-20 hidden sm:block"></div>
          </div>

          {/* 액션 버튼들 - md 이상: 항상 표시, md 미만: 메뉴 버튼 */}
          <div className="flex-shrink-0 relative">
            {/* 모바일/태블릿: 메뉴 버튼 (md 미만) */}
            <div className="md:hidden w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>

            {/* 데스크톱: 모든 버튼 표시 (md 이상) */}
            <div className="hidden md:flex items-center gap-2">
              {/* 방문하기 버튼 */}
              <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              {/* 수정 버튼 */}
              <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              {/* 즐겨찾기 버튼 */}
              <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              {/* 상하 이동 버튼들 */}
              <div className="flex flex-col gap-0.5">
                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              {/* 구분선 */}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
              {/* 삭제 버튼 */}
              <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
