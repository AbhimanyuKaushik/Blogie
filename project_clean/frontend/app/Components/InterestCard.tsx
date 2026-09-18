"use client";

import type { LucideIcon } from "lucide-react";

type InterestCardProps = {
  title: string;
  selected: boolean;
  icon: LucideIcon;
  onClick: () => void;
};

export default function InterestCard({
  title,
  selected,
  icon: Icon,
  onClick,
}: InterestCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex aspect-square w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
        selected
          ? "border-fuchsia-700 bg-fuchsia-50 shadow-md shadow-fuchsia-700/10"
          : "border-gray-200 bg-white hover:-translate-y-1 hover:border-fuchsia-300 hover:shadow-md"
      }`}
    >
      {/* Interest Icon */}
      <Icon
        size={48}
        strokeWidth={1.8}
        className={`transition-all duration-300 ${
          selected ? "scale-110 text-fuchsia-700" : "text-gray-700"
        }`}
      />

      {/* Interest Title */}
      <span
        className={`text-base font-semibold transition-colors duration-300 sm:text-lg ${
          selected ? "text-fuchsia-700" : "text-gray-800"
        }`}
      >
        {title}
      </span>
    </button>
  );
}
