import React from "react";

export const MobileIconSkeleton: React.FC = () => (
  <div className="relative flex flex-col items-center w-full">
    <div className="p-1">
      <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
    </div>
    <div className="mt-0.5 w-10 h-2 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
  </div>
);
