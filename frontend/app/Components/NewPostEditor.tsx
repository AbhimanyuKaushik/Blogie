"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BlockType, DocumentAST, ImageAttrs } from "../Types/PostTypes";
import TextBlock from "../Components/StateBlocks/TextBlock";

function getVideoEmbedUrl(url: string): string {
  const trimmed = url.trim();

  const ytMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return trimmed;
}

export default function NewPostEditor() {
  const [ast, setAst] = useState<DocumentAST>({
    schemaVersion: 1,
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "title",
        content: [{ type: "text", value: "" }],
      },
      {
        id: crypto.randomUUID(),
        type: "intro",
        content: [{ type: "text", value: "" }],
      },
      {
        id: crypto.randomUUID(),
        type: "paragraph",
        content: [{ type: "text", value: "" }],
      },
    ],
  });

  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [slashTargetId, setSlashTargetId] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [isEditable, setIsEditable] = useState(true);
  const [slashMenuPosition, setSlashMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [formatToolbar, setFormatToolbar] = useState<{
    top: number;
    left: number;
    blockId: string;
  } | null>(null);
  const updateBlock = (id: string, value: string) => {
    setAst((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id ? { ...b, content: [{ type: "text", value }] } : b,
      ),
    }));
  };

  const extractTitleFromAST = (ast: DocumentAST): string => {
    const titleBlock = ast.blocks.find((b) => b.type === "title");
    if (!titleBlock) return "";

    const node = titleBlock.content?.[0];
    const html = node && node.type === "text" ? node.value : "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.innerText.trim();
  };

  const handlePublish = async () => {
    const title = extractTitleFromAST(ast);

    if (!title) {
      alert("Title is required");
      return;
    }

    const res = await fetch("http://localhost:5000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title,
        document: ast,
        tags: [],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.message || "Failed to publish");
      return;
    }

    const data = await res.json();
    console.log("Published post:", data.post);
  };

  const handleEnter = (id: string, offset: number, plainText?: string) => {
    const index = ast.blocks.findIndex((b) => b.id === id);
    if (index === -1) return;

    const block = ast.blocks[index];
    const text =
      typeof plainText === "string"
        ? plainText
        : block.content?.[0]?.type === "text"
          ? (() => {
              const raw = block.content[0].value;
              if (typeof document === "undefined") return raw;
              const div = document.createElement("div");
              div.innerHTML = raw;
              return div.innerText ?? raw;
            })()
          : "";

    // In title: do not create a new block and do not move focus
    if (block.type === "title") return;

    let newBlocks: DocumentAST["blocks"];
    let newFocusId: string;

    if (block.type === "intro") {
      newFocusId = crypto.randomUUID();
      const updated = [...ast.blocks];
      updated.splice(index + 1, 0, {
        id: newFocusId,
        type: "paragraph",
        content: [{ type: "text", value: "" }],
      });
      newBlocks = updated;
    } else {
      const before = text.slice(0, offset);
      const after = text.slice(offset);
      newFocusId = crypto.randomUUID();
      const updated = [...ast.blocks];
      updated[index] = { ...block, content: [{ type: "text", value: before }] };
      updated.splice(index + 1, 0, {
        id: newFocusId,
        type: "paragraph",
        content: [{ type: "text", value: after }],
      });
      newBlocks = updated;
    }

    console.log("Updated blocks:", newBlocks);
    setAst((prev) => ({ ...prev, blocks: newBlocks }));
    setFocusedBlockId(newFocusId);
  };

  const stripHtmlToText = (html: string): string => {
    if (typeof document === "undefined") return html;
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.innerText ?? html;
  };

  const deleteEmptyBlock = (id: string) => {
    setAst((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      const block = prev.blocks[index];
      if (block.type === "title") return prev;

      if (block.type === "intro") {
        setFocusedBlockId(prev.blocks[0].id);
        return prev;
      }

      const updated = [...prev.blocks];
      const prevBlock = updated[index - 1];
      updated.splice(index, 1);
      setFocusedBlockId(prevBlock.id);
      return { ...prev, blocks: updated };
    });
  };

  const mergeWithPreviousBlock = (id: string, currentPlainText?: string) => {
    setAst((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === id);
      if (index === -1 || index === 0) return prev;

      const block = prev.blocks[index];
      const prevBlock = prev.blocks[index - 1];

      const prevRaw =
        prevBlock.content?.[0]?.type === "text"
          ? prevBlock.content[0].value
          : "";
      const prevText = stripHtmlToText(prevRaw);
      const currText =
        typeof currentPlainText === "string"
          ? currentPlainText
          : stripHtmlToText(
              block.content?.[0]?.type === "text" ? block.content[0].value : "",
            );

      const mergeOffset = prevText.length;

      const updated = [...prev.blocks];
      updated[index - 1] = {
        ...prevBlock,
        content: [{ type: "text", value: prevText + currText }],
      };
      updated.splice(index, 1);

      // Focus on previous block and set cursor at merge point
      setTimeout(() => {
        const prevBlockElement = document.querySelector(
          `[data-block-id="${prevBlock.id}"]`,
        ) as HTMLDivElement;

        if (prevBlockElement) {
          prevBlockElement.focus();
          const sel = window.getSelection();
          if (!sel) return;

          // Wait for the DOM to update with new content
          setTimeout(() => {
            const range = document.createRange();
            const textNode = prevBlockElement.firstChild;

            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
              range.setStart(
                textNode,
                Math.min(mergeOffset, textNode.textContent?.length ?? 0),
              );
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }, 0);
        }
      }, 0);

      setFocusedBlockId(prevBlock.id);
      return { ...prev, blocks: updated };
    });
  };

  const moveFocus = (id: string, direction: "up" | "down") => {
    const index = ast.blocks.findIndex((b) => b.id === id);
    if (index === -1) return;
    const target = ast.blocks[direction === "up" ? index - 1 : index + 1];
    if (target) setFocusedBlockId(target.id);
  };

  const SLASH_MENU_WIDTH = 220;
  const SLASH_MENU_MAX_HEIGHT = 320;
  const VIEWPORT_PADDING = 12;

  const handleSlash = useCallback((id: string, rect?: DOMRect) => {
    setSlashTargetId(id);
    if (!rect || typeof window === "undefined") return;

    let top = rect.bottom + 6;
    let left = rect.left;

    // Keep menu inside viewport vertically
    if (top + SLASH_MENU_MAX_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
      top = rect.top - SLASH_MENU_MAX_HEIGHT - 6;
    }
    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING;
    }

    // Keep menu inside viewport horizontally
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    }
    if (left + SLASH_MENU_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
      left = window.innerWidth - SLASH_MENU_WIDTH - VIEWPORT_PADDING;
    }

    setSlashMenuPosition({ top, left });
  }, []);

  const handleSelectionChange = useCallback(
    (blockId: string, rect: DOMRect | null) => {
      if (!rect) {
        setFormatToolbar(null);
        return;
      }
      setFormatToolbar({
        top: rect.top - 48,
        left: rect.left + rect.width / 2 - 80,
        blockId,
      });
    },
    [],
  );

  const clearSlashMenu = useCallback(() => {
    setSlashTargetId(null);
    setSlashIndex(0);
    setSlashMenuPosition(null);
  }, []);

  const insertBlock = useCallback(
    (type: BlockType) => {
      if (!slashTargetId) return;

      clearSlashMenu();

      if (type === "image" || type === "video") {
        const url = prompt(
          type === "video"
            ? "Enter YouTube or Vimeo URL (e.g. https://www.youtube.com/watch?v=...)"
            : `Enter ${type} URL`,
        );
        if (!url?.trim()) return;

        const src = type === "video" ? getVideoEmbedUrl(url) : url.trim();

        setAst((prev) => {
          const index = prev.blocks.findIndex((b) => b.id === slashTargetId);
          if (index === -1) return prev;

          const mediaId = crypto.randomUUID();
          const paragraphId = crypto.randomUUID();

          const updated = [...prev.blocks];

          const currentBlock = updated[index];
          const currentText =
            currentBlock.content?.[0]?.type === "text"
              ? currentBlock.content[0].value.replace(/\/$/, "")
              : "";

          updated[index] = {
            ...currentBlock,
            content: [{ type: "text", value: currentText }],
          };

          updated.splice(
            index + 1,
            0,
            {
              id: mediaId,
              type,
              attrs: { src, width: type === "image" ? 100 : undefined },
            },
            {
              id: paragraphId,
              type: "paragraph",
              content: [{ type: "text", value: "" }],
            },
          );

          setFocusedBlockId(paragraphId);
          return { ...prev, blocks: updated };
        });

        setSlashTargetId(null);
        return;
      }

      setAst((prev) => {
        const index = prev.blocks.findIndex((b) => b.id === slashTargetId);
        if (index === -1) return prev;

        const updated = [...prev.blocks];
        const currentText =
          updated[index].content?.[0]?.type === "text"
            ? updated[index].content[0].value.replace(/\/$/, "")
            : "";
        updated[index] = {
          ...updated[index],
          type,
          content: [{ type: "text", value: currentText }],
        };

        return { ...prev, blocks: updated };
      });

      setFocusedBlockId(slashTargetId);
      setSlashTargetId(null);
    },
    [clearSlashMenu, slashTargetId],
  );

  const slashOptions = useMemo(
    () => [
      { label: "Paragraph", type: "paragraph" as const },
      { label: "Heading", type: "heading" as const },
      { label: "Code", type: "code" as const },
      { label: "Image", type: "image" as const },
      { label: "Video", type: "video" as const },
    ],
    [],
  );

  // Selection API–based formatting (no deprecated execCommand)
  const applyFormat = useCallback((command: "bold" | "italic" | "link") => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    if (command === "link") {
      const url = prompt("Enter URL");
      if (!url?.trim()) return;
      const a = document.createElement("a");
      a.href = url.trim();
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      try {
        range.surroundContents(a);
      } catch {
        const contents = range.extractContents();
        a.appendChild(contents);
        range.insertNode(a);
      }
      return;
    }

    const tag = command === "bold" ? "strong" : "em";
    const el = document.createElement(tag);
    try {
      range.surroundContents(el);
    } catch {
      const contents = range.extractContents();
      el.appendChild(contents);
      range.insertNode(el);
    }
  }, []);

  const startResize = (e: React.MouseEvent, id: string) => {
    e.preventDefault();

    const startX = e.clientX;
    const containerWidth = 800;

    const block = ast.blocks.find((b) => b.id === id);
    const initialWidth = (block?.attrs as ImageAttrs)?.width ?? 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const deltaPercent = (delta / containerWidth) * 100;

      const newWidth = Math.min(100, Math.max(20, initialWidth + deltaPercent));

      setAst((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === id
            ? {
                ...b,
                attrs: {
                  ...(b.attrs as ImageAttrs),
                  width: newWidth,
                },
              }
            : b,
        ),
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    if (!slashTargetId) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashOptions.length);
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i === 0 ? slashOptions.length - 1 : i - 1));
      }

      if (e.key === "Enter") {
        e.preventDefault();
        insertBlock(slashOptions[slashIndex].type);
      }

      if (e.key === "Escape") {
        e.preventDefault();
        clearSlashMenu(); // Use the clear function
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slashTargetId, slashIndex, slashOptions, insertBlock, clearSlashMenu]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" && focusedBlockId) {
        const block = ast.blocks.find((b) => b.id === focusedBlockId);
        if (block && (block.type === "image" || block.type === "video")) {
          e.preventDefault();
          deleteEmptyBlock(focusedBlockId);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusedBlockId, ast.blocks]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        slashTargetId &&
        !target.closest("[data-block-id]") &&
        !target.closest(".fixed")
      ) {
        clearSlashMenu();
      }
      if (
        formatToolbar &&
        !target.closest("[data-block-id]") &&
        !target.closest("[data-format-toolbar]")
      ) {
        setFormatToolbar(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [slashTargetId, clearSlashMenu, formatToolbar]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setFormatToolbar(null);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);
  return (
    <form className="max-w-170 mx-auto px-4 py-10 sm:py-16">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setIsEditable(!isEditable)}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={isEditable ? "Switch to preview" : "Switch to edit"}
        >
          {isEditable ? "Preview" : "Edit"}
        </button>
      </div>
      {ast.blocks.map((block) => {
        if (block.type === "image") {
          const attrs = block.attrs as ImageAttrs;
          return (
            <div key={block.id} className="my-6">
              <div
                onClick={() => setFocusedBlockId(block.id)}
                className={`relative my-6 ${
                  focusedBlockId === block.id ? "ring-2 ring-blue-400" : ""
                }`}
              >
                {focusedBlockId === block.id && (
                  <div
                    className="absolute right-0 top-1/2 w-3 h-10 bg-blue-500 cursor-ew-resize"
                    onMouseDown={(e) => startResize(e, block.id)}
                  />
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attrs.src}
                  style={{ width: `${attrs.width ?? 100}%` }}
                  className="rounded"
                  alt=""
                />
              </div>
            </div>
          );
        }

        if (block.type === "video") {
          const attrs = block.attrs as ImageAttrs;
          const embedSrc = getVideoEmbedUrl(attrs?.src ?? "");
          return (
            <div key={block.id} className="my-6">
              <iframe
                src={embedSrc}
                className="w-full aspect-video rounded"
                allowFullScreen
                title="Video embed"
              />
            </div>
          );
        }

        return (
          <TextBlock
            key={block.id}
            block={block}
            onChange={updateBlock}
            onEnter={handleEnter}
            onDelete={deleteEmptyBlock}
            onBackspaceAtStart={mergeWithPreviousBlock}
            onMove={moveFocus}
            onSlash={handleSlash}
            onFormat={applyFormat}
            onSelectionChange={handleSelectionChange}
            isFocused={focusedBlockId === block.id}
            isEditable={isEditable}
            slashMenuOpen={!!slashTargetId}
          />
        );
      })}
      {formatToolbar && (
        <div
          data-format-toolbar
          className="fixed z-50 flex items-center gap-0.5 bg-[#1a1a1a] text-white rounded-lg shadow-lg py-1 px-1"
          style={{
            top: `${formatToolbar.top}px`,
            left: `${formatToolbar.left}px`,
          }}
        >
          <button
            type="button"
            className="p-2 rounded hover:bg-white/15 transition-colors font-semibold text-sm"
            onClick={() => applyFormat("bold")}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            className="p-2 rounded hover:bg-white/15 transition-colors italic text-sm"
            onClick={() => applyFormat("italic")}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            type="button"
            className="p-2 rounded hover:bg-white/15 transition-colors text-sm"
            onClick={() => applyFormat("link")}
            title="Link (Ctrl+K)"
          >
            Link
          </button>
        </div>
      )}
      {slashTargetId && slashMenuPosition && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-50"
          style={{
            top: `${slashMenuPosition.top}px`,
            left: `${slashMenuPosition.left}px`,
            width: `${SLASH_MENU_WIDTH}px`,
            maxHeight: `${SLASH_MENU_MAX_HEIGHT}px`,
            overflowY: "auto",
          }}
        >
          <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
            Add block
          </p>
          {slashOptions.map((opt, i) => {
            const isSelected = i === slashIndex;
            const isCode = opt.type === "code";
            const isHeading = opt.type === "heading";
            return (
              <button
                type="button"
                key={opt.type}
                className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                  isSelected
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                } ${isCode ? "font-mono text-sm" : ""} ${isHeading ? "text-base" : "text-sm"}`}
                onMouseEnter={() => setSlashIndex(i)}
                onClick={() => insertBlock(opt.type)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex justify-around gap-3 mb-6">
        <textarea className="outline">
          
        </textarea>
        <button
          type="button"
          onClick={handlePublish}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-black/90"
        >
          Publish
        </button>
      </div>
    </form>
  );
}
