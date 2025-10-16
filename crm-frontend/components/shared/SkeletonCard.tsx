// components/ui/SkeletonCard.tsx
import React from "react";
import { SkeletonBlock, SkeletonText } from "@/components/feedback/Skeleton";

export default function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
      <SkeletonBlock className="h-40 w-full rounded-xl mb-4" />
      <SkeletonText lines={2} />
    </div>
  );
}
