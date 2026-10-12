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
      className={`
        group relative flex aspect-square w-full flex-col
        items-center justify-center gap-4 overflow-hidden
        rounded-2xl border-2 p-4
        transition-all duration-200 ease-out
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[#00A63E] focus-visible:ring-offset-2
        ${
          selected
            ? "border-[#00A63E] bg-[#00A63E]/5 text-[#008C35] shadow-md shadow-[#00A63E]/15"
            : "border-slate-200 bg-white text-slate-600 hover:-translate-y-1 hover:border-[#00A63E]/50 hover:bg-[#00A63E]/5 hover:shadow-md"
        }
      `}
    >
      <span
        className={`
          flex h-14 w-14 items-center justify-center rounded-2xl
          transition-colors duration-200
          ${
            selected
              ? "bg-[#00A63E] text-white"
              : "bg-slate-100 text-slate-600 group-hover:bg-[#00A63E]/10 group-hover:text-[#008C35]"
          }
        `}
      >
        <Icon size={29} strokeWidth={1.8} />
      </span>

      <span className="text-sm font-semibold sm:text-base">
        {title}
      </span>

      {selected && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#00A63E] text-white shadow-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
        </span>
      )}
    </button>
  );
}