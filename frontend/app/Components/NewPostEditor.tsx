"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BlockType, DocumentAST, ImageAttrs } from "../Types/PostTypes";
import TextBlock from "../Components/StateBlocks/TextBlock";

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

  const updateBlock = (id: string, value: string) => {
    setAst((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id ? { ...b, content: [{ type: "text", value }] } : b,
      ),
    }));
  };

  const handleEnter = (id: string, offset: number) => {
    setAst((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      const block = prev.blocks[index];
      const text =
        block.content?.[0]?.type === "text" ? block.content[0].value : "";

      if (block.type === "title") {
        setFocusedBlockId(prev.blocks[index + 1]?.id ?? null);
        return prev;
      }

      if (block.type === "intro") {
        const newId = crypto.randomUUID();
        const updated = [...prev.blocks];
        updated.splice(index + 1, 0, {
          id: newId,
          type: "paragraph",
          content: [{ type: "text", value: "" }],
        });
        setFocusedBlockId(newId);
        return { ...prev, blocks: updated };
      }

      const before = text.slice(0, offset);
      const after = text.slice(offset);
      const newId = crypto.randomUUID();

      const updated = [...prev.blocks];
      updated[index] = { ...block, content: [{ type: "text", value: before }] };
      updated.splice(index + 1, 0, {
        id: newId,
        type: "paragraph",
        content: [{ type: "text", value: after }],
      });

      setFocusedBlockId(newId);
      console.log("Enter pressed", id, index, offset);
      return { ...prev, blocks: updated };
    });
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

  const mergeWithPreviousBlock = (id: string) => {
    setAst((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === id);
      if (index === -1 || index === 0) return prev;

      const block = prev.blocks[index];
      const prevBlock = prev.blocks[index - 1];

      const prevText =
        prevBlock.content?.[0]?.type === "text"
          ? prevBlock.content[0].value
          : "";
      const currText =
        block.content?.[0]?.type === "text" ? block.content[0].value : "";

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

  const handleSlash = useCallback((id: string, rect: DOMRect) => {
    setSlashTargetId(id);

    // Calculate position for the menu
    const menuWidth = 192; // w-48 = 12rem = 192px
    const menuHeight = 200; // Approximate height

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default position: below the block
    let top = rect.bottom + 5;
    let left = rect.left;

    // Check if menu would go off bottom of screen
    if (top + menuHeight > viewportHeight) {
      // Position above the block instead
      top = rect.top - menuHeight - 5;
    }

    // Check if menu would go off right side of screen
    if (left + menuWidth > viewportWidth) {
      // Align right edge with block's right edge
      left = rect.right - menuWidth;
    }

    // Check if menu would go off left side of screen
    if (left < 0) {
      left = 5; // Add a small margin
    }

    setSlashMenuPosition({ top, left });
  }, []);

  const clearSlashMenu = useCallback(() => {
    setSlashTargetId(null);
    setSlashIndex(0);
    setSlashMenuPosition(null);
  }, []);

  const insertBlock = useCallback(
    (type: BlockType) => {
      if (!slashTargetId) return;

      const targetId = slashTargetId;
      clearSlashMenu();

      if (type === "image" || type === "video") {
        const url = prompt(`Enter ${type} URL`);
        if (!url) return;

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
              attrs: { src: url, width: 100 },
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
          content: [{ type: "text", value: "" }],
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
      { label: "Image", type: "image" as const },
      { label: "Video", type: "video" as const },
      { label: "Code", type: "code" as const },
    ],
    [],
  );

  const applyFormat = (command: "bold" | "italic" | "link") => {
    if (command === "link") {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      const saved = range.cloneRange();
      const url = prompt("Enter URL");
      if (!url) return;

      sel.removeAllRanges();
      sel.addRange(saved);
      document.execCommand("createLink", true, url);
      if (sel.anchorNode?.parentElement) {
        (sel.anchorNode.parentElement as HTMLAnchorElement).target = "_blank";
      }
      return;
    }

    document.execCommand(command);
  };

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
      if (
        slashTargetId &&
        !(e.target as HTMLElement).closest("[data-block-id]") &&
        !(e.target as HTMLElement).closest(".fixed")
      ) {
        clearSlashMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [slashTargetId, clearSlashMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        slashTargetId &&
        !(e.target as HTMLElement).closest("[data-block-id]")
      ) {
        setSlashTargetId(null);
        setSlashIndex(0);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [slashTargetId]);
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-end justify-end gap-3">
        <button
          onClick={() => setIsEditable(!isEditable)}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isEditable
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
          }`}
        >
          {isEditable ? "Editing" : "Preview Mode"}
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
          return (
            <div key={block.id} className="my-6">
              <iframe
                src={attrs.src}
                className="w-full aspect-video rounded"
                allowFullScreen
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
            onSlash={setSlashTargetId}
            onFormat={applyFormat}
            isFocused={focusedBlockId === block.id}
            isEditable={isEditable}
          />
        );
      })}
      {slashTargetId && slashMenuPosition && (
        <div
          className="fixed bg-white border rounded-lg shadow-lg p-1 w-48 z-50"
          style={{
            top: `${slashMenuPosition.top}px`,
            left: `${slashMenuPosition.left}px`,
            // Add some max height and scroll if needed
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {slashOptions.map((opt, i) => (
            <div
              key={opt.type}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 rounded ${
                i === slashIndex ? "bg-blue-50 text-blue-600" : "text-gray-700"
              }`}
              onMouseEnter={() => setSlashIndex(i)}
              onClick={() => insertBlock(opt.type)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
