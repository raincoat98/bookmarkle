import React from "react";

export const MobileIconSkeleton: React.FC = () => {
  return (
    <div className="relative group flex flex-col items-center w-full">
      {/* 아이콘 */}
      <div className="relative p-1 group">
        <div className="block w-10 h-10 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-lg overflow-hidden animate-pulse">
          {/* 파비콘 스켈레톤 */}
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600">
            <div className="w-8 h-8 rounded bg-gray-300/50 dark:bg-gray-600/50"></div>
          </div>
        </div>
      </div>

      {/* 제목 */}
      <div className="mt-1 text-center w-full px-1 min-w-0">
        <div className="text-xs leading-tight bg-gray-300 dark:bg-gray-600 rounded w-16 mx-auto animate-pulse h-3"></div>
      </div>
    </div>
  );
};
