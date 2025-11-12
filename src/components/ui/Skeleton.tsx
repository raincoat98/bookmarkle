import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  const baseClass =
    "animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-700/60";
  return <div className={`${baseClass} ${className}`.trim()} />;
};


