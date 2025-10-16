// components/feedback/Skeleton.tsx
import React from "react";
import clsx from "clsx";

type Props = { className?: string };

export const SkeletonBlock = ({ className }: Props) => (
  <div className={clsx("skeleton-base rounded-md", className)} />
);

export const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={clsx("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={clsx(
          "skeleton-base h-4 rounded",
          i === lines - 1 ? "w-2/3" : "w-full"
        )}
      />
    ))}
  </div>
);

export const SkeletonAvatar = ({ size = 40, className }: { size?: number; className?: string }) => (
  <div
    className={clsx("skeleton-base rounded-full", className)}
    style={{ width: size, height: size }}
  />
);

export const SkeletonButton = ({ className }: Props) => (
  <div className={clsx("skeleton-base h-10 w-28 rounded-lg", className)} />
);
