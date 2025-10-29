// components/feedback/Skeleton.tsx
import React from "react";
import clsx from "clsx";

type Props = { className?: string };

// Base skeleton with shimmer effect
const shimmerBase = "relative overflow-hidden bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-shimmer";

export const SkeletonBlock = ({ className }: Props) => (
  <div className={clsx(shimmerBase, "rounded-md", className)} />
);

export const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={clsx("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={clsx(
          shimmerBase,
          "h-4 rounded",
          i === lines - 1 ? "w-2/3" : "w-full"
        )}
      />
    ))}
  </div>
);

export const SkeletonAvatar = ({ size = 40, className }: { size?: number; className?: string }) => (
  <div
    className={clsx(shimmerBase, "rounded-full", className)}
    style={{ width: size, height: size }}
  />
);

export const SkeletonButton = ({ className }: Props) => (
  <div className={clsx(shimmerBase, "h-10 w-28 rounded-lg", className)} />
);
