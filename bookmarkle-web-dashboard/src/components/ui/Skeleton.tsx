import React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className = "", ...props }, ref) => {
    const classes = ["skeleton-base", "skeleton-shimmer", className]
      .filter(Boolean)
      .join(" ")
      .trim();

    return <div ref={ref} className={classes} {...props} />;
  }
);

Skeleton.displayName = "Skeleton";
