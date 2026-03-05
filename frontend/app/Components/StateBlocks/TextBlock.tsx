"use client";

import { BlockNode } from "../../Types/PostTypes";
import { FC, useEffect, useRef } from "react";

type Props = {
  block: BlockNode;
  onChange: (id: string, value: string) => void;
  onEnter: (id: string, offset: number, plainText?: string) => void;
  onDelete: (id: string) => void;
  onBackspaceAtStart: (id: string, currentPlainText?: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onSlash: (id: string, rect?: DOMRect) => void;
  onFormat: (command: "bold" | "italic" | "link") => void;
  onSelectionChange?: (blockId: string, rect: DOMRect | null) => void;
  isFocused: boolean;
  isEditable: boolean;
  slashMenuOpen?: boolean;
};

const TextBlock: FC<Props> = ({
  block,
  onChange,
  onEnter,
  onDelete,
  onBackspaceAtStart,
  onMove,
  onSlash,
  onFormat,
  onSelectionChange,
  isFocused,
  isEditable,
  slashMenuOpen = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Persist HTML so bold/italic/link formatting is preserved (Medium-style)
  useEffect(() => {
    if (!ref.current) return;
    const value =
      block.content?.[0]?.type === "text" ? block.content[0].value : "";
    if (ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [block.content]);

  useEffect(() => {
    if (!isFocused) return;
    // Defer focus so the new block is painted before we move the cursor
    const t = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }, 10);
    return () => clearTimeout(t);
  }, [isFocused]);

  const isTitle = block.type === "title";
  const isIntro = block.type === "intro";
  const isHeading = block.type === "heading";
  const isCode = block.type === "code";
  const isParagraph = block.type === "paragraph";

  const placeholder =
    isTitle ? "Title" : isIntro ? "Write your story..." : isCode ? "Code" : "";

  return (
    <div
      ref={ref}
      contentEditable={isEditable}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      data-block-id={block.id}
      className={`
        outline-none min-h-[1.5em] ${isEditable ? "cursor-text" : "cursor-default"}
        ${isTitle ? "text-[2.75rem] font-bold leading-[1.15] tracking-tight text-gray-900 mb-4" : ""}
        ${isIntro ? "text-xl text-gray-500 leading-relaxed mb-6" : ""}
        ${isParagraph ? "text-[1.125rem] text-gray-800 leading-[1.6] mb-5" : ""}
        ${isHeading ? "text-xl font-bold text-gray-900 leading-snug mb-4" : ""}
        ${isCode
          ? "font-mono text-sm text-gray-200 bg-[#1e1e1e] rounded-md px-4 py-3 mb-5 overflow-x-auto border border-gray-700/50"
          : ""}
        empty:before:content-[attr(data-placeholder)]
        empty:before:text-gray-400
        empty:before:pointer-events-none
      `}
      onKeyDown={(e) => {
        // When slash menu is open, prevent cursor movement so the menu stays usable
        if (slashMenuOpen) {
          const cursorKeys = [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ];
          if (cursorKeys.includes(e.key)) {
            e.preventDefault();
            return;
          }
        }

        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        const offset = range.startOffset;
        const length = ref.current?.innerText.length ?? 0;

        if (e.key === "Enter") {
          e.preventDefault();
          onEnter(block.id, offset, ref.current?.innerText ?? "");
          return;
        }

        if (e.key === "Backspace" && length === 0) {
          e.preventDefault();
          onDelete(block.id);
          return;
        }

        if (e.key === "Backspace" && offset === 0 && length > 0) {
          e.preventDefault();
          onBackspaceAtStart(block.id, ref.current?.innerText ?? "");
          return;
        }

        if (e.key === "ArrowUp" && offset === 0) {
          e.preventDefault();
          onMove(block.id, "up");
          return;
        }

        if (e.key === "ArrowDown" && offset === length) {
          e.preventDefault();
          onMove(block.id, "down");
          return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key === "b") {
          e.preventDefault();
          onFormat("bold");
          return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key === "i") {
          e.preventDefault();
          onFormat("italic");
          return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          onFormat("link");
          return;
        }
      }}
      onInput={() => {
        const html = ref.current?.innerHTML ?? "";
        const text = ref.current?.innerText ?? "";
        if (text === "/" && block.type === "paragraph") {
          const rect = ref.current?.getBoundingClientRect();
          if (rect) onSlash(block.id, rect);
          return;
        }
        if (text.endsWith("/") && block.type === "paragraph") {
          const rect = ref.current?.getBoundingClientRect();
          if (rect) onSlash(block.id, rect);
        }
        onChange(block.id, html);
      }}
      onMouseUp={() => {
        if (!isEditable || !onSelectionChange) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          onSelectionChange(block.id, null);
          return;
        }
        if (!ref.current?.contains(sel.anchorNode)) return;
        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          onSelectionChange(block.id, null);
          return;
        }
        const rect = range.getBoundingClientRect();
        onSelectionChange(block.id, rect);
      }}
      onKeyUp={() => {
        if (!isEditable || !onSelectionChange) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          onSelectionChange(block.id, null);
          return;
        }
        if (!ref.current?.contains(sel.anchorNode)) return;
        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          onSelectionChange(block.id, null);
          return;
        }
        const rect = range.getBoundingClientRect();
        onSelectionChange(block.id, rect);
      }}
    ></div>
  );
};

export default TextBlock;