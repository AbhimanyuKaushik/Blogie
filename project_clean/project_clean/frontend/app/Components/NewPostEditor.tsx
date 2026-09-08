"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { BlockType, DocumentAST, ImageAttrs } from "../Types/PostTypes";
import TextBlock from "../Components/StateBlocks/TextBlock";
import { BlockNode, DOCUMENT_SCHEMA_VERSION } from "../Types/PostTypes";
import { useAuth } from "../Context/AuthContext";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

type Collaborator = {
  user: {
    _id: string;
    username: string;
  };
  role: "editor" | "commenter";
};

const createBlock = (type: BlockType, value = ""): BlockNode => ({
  id: crypto.randomUUID(),
  type,
  content: [
    {
      type: "text",
      value,
    },
  ],
  version: 1,
  updatedAt: new Date().toISOString(),
  updatedBy: "",
});

export function getVideoEmbedUrl(url: string): string {
  const trimmed = url.trim();
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return trimmed;
}

// ─── Yjs conversion helpers ───────────────────────────────────────────
function blockToYMap(block: BlockNode, yDoc: Y.Doc): Y.Map<any> {
  const map = new Y.Map();
  map.set("id", block.id);
  map.set("type", block.type);
  map.set("version", block.version);
  map.set("updatedAt", block.updatedAt);
  map.set("updatedBy", block.updatedBy ?? "");

  if (block.attrs) {
    map.set("attrs", block.attrs);
  }

  const yText = new Y.Text();
  const textValue =
    block.content?.[0]?.type === "text" ? block.content[0].value : "";
  if (textValue) yText.insert(0, textValue);
  map.set("content", yText);

  return map;
}

function yMapToBlock(map: Y.Map<any>): BlockNode {
  const contentYText = map.get("content") as Y.Text | undefined;
  const value = contentYText ? contentYText.toString() : "";

  return {
    id: map.get("id"),
    type: map.get("type"),
    version: map.get("version") ?? 1,
    updatedAt: map.get("updatedAt") ?? new Date().toISOString(),
    updatedBy: map.get("updatedBy") ?? "",
    content: value ? [{ type: "text", value }] : undefined,
    attrs: map.get("attrs"),
  };
}

export default function NewPostEditor({
  initialPostId,
}: { initialPostId?: string } = {}) {
  const [ast, setAst] = useState<DocumentAST>({
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    blocks: [
      createBlock("title"),
      createBlock("intro"),
      createBlock("paragraph"),
    ],
  });

  const [postId, setPostId] = useState<string | null>(initialPostId || null);
  const [collaborationEnabled, setCollaborationEnabled] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [slashTargetId, setSlashTargetId] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [isEditable, setIsEditable] = useState(true);
  const [users, setUsers] = useState<string[]>([]);
  const [collabUsername, setCollabUsername] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [collabRole, setCollabRole] = useState<"editor" | "commenter">(
    "editor",
  );
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [canManageCollaborators, setCanManageCollaborators] = useState(false);
  const [userRole, setUserRole] = useState<
    "owner" | "editor" | "commenter" | null
  >(null);
  const [slashMenuPosition, setSlashMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [formatToolbar, setFormatToolbar] = useState<{
    top: number;
    left: number;
    blockId: string;
  } | null>(null);
  const [lastAst, setLastAst] = useState(ast);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, { blockId: string; pos: number }>
  >({});

  const isRemoteUpdate = useRef(false);
  const { user } = useAuth();
  const yDocRef = useRef<Y.Doc | null>(null);
  const yBlocksRef = useRef<Y.Array<Y.Map<any>> | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const extractPostFromData = (data: any) => (data.post ? data.post : data);

  const resolveCollaborationPermissions = (post: any) => {
    const currentUserId = user?.id;
    const authorId = post?.author?._id || post?.author?.id || post?.author;
    const isOwner = Boolean(
      currentUserId && authorId && String(authorId) === String(currentUserId),
    );

    return {
      isOwner,
      canManage: isOwner || Boolean(post?.canManageCollaborators),
      role: post?.currentUserRole || (isOwner ? "owner" : null),
    };
  };

  const ensurePostExists = async () => {
    if (postId) return postId;

    const res = await fetch("http://localhost:8080/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: "Untitled Post", document: ast, tags }),
    });

    if (!res.ok) throw new Error("Failed to create post");
    const data = await res.json();
    const post = extractPostFromData(data);
    setPostId(post._id);
    return post._id;
  };

  const updateBlock = (id: string, value: string) => {
    if (userRole === "commenter") return;

    setAst((prev) => {
      const blocks = prev.blocks.map((block) => {
        if (block.id !== id) return block;

        return {
          ...block,
          content: [
            {
              type: "text" as const,
              value,
            },
          ],
          version: block.version + 1,
          updatedAt: new Date().toISOString(),
          updatedBy: block.updatedBy,
        };
      });

      const newAst: DocumentAST = {
        ...prev,
        blocks,
      };

      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
      }

      setLastAst(newAst);
      return newAst;
    });
  };

  const enableCollaboration = async () => {
    if (collaborationEnabled) return;

    try {
      const id = await ensurePostExists();
      setCollaborationEnabled(true);

      const res = await fetch(`http://localhost:8080/api/posts/${id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const post = extractPostFromData(data);
        const collaboratorEntries = (post.collaborators || []).filter(
          (c: Collaborator) => c?.user?._id,
        );
        const { canManage, role } = resolveCollaborationPermissions(post);
        setCollaborators(collaboratorEntries);
        setCanManageCollaborators(canManage);
        setUserRole(role);
      }
    } catch (e) {
      console.error(e);
    }
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

    const id = await ensurePostExists();
    const res = await fetch(`http://localhost:8080/api/posts/${id}/publish`, {
      method: "PATCH",
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to publish");
      return;
    }

    const data = await res.json();
    const post = extractPostFromData(data);
    console.log("Published:", post);
    alert("Post published!");
  };

  const handleEnter = (id: string, offset: number, plainText?: string) => {
    if (userRole === "commenter") return;

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

    if (block.type === "title") return;

    let newBlocks: DocumentAST["blocks"];
    let newFocusId: string;

    if (block.type === "intro") {
      newFocusId = crypto.randomUUID();
      const updated = [...ast.blocks];
      updated.splice(index + 1, 0, {
        ...createBlock("paragraph"),
        id: newFocusId,
      });
      newBlocks = updated;
    } else {
      const before = text.slice(0, offset);
      const after = text.slice(offset);
      newFocusId = crypto.randomUUID();

      const updated = [...ast.blocks];
      updated[index] = {
        ...block,
        content: [{ type: "text", value: before }],
        version: block.version + 1,
        updatedAt: new Date().toISOString(),
      };
      updated.splice(index + 1, 0, {
        ...createBlock("paragraph", after),
        id: newFocusId,
      });
      newBlocks = updated;
    }

    const updatedAst: DocumentAST = {
      ...ast,
      blocks: newBlocks,
    };

    setAst(updatedAst);
    setLastAst(updatedAst);
    setFocusedBlockId(newFocusId);
  };

  const stripHtmlToText = (html: string): string => {
    if (typeof document === "undefined") return html;
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.innerText ?? html;
  };

  const deleteEmptyBlock = (id: string) => {
    if (userRole === "commenter") return;

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
      const previous = updated[index - 1];

      if (previous) {
        updated[index - 1] = {
          ...previous,
          version: previous.version + 1,
          updatedAt: new Date().toISOString(),
          updatedBy: previous.updatedBy,
        };
      }

      updated.splice(index, 1);

      const newAst: DocumentAST = {
        ...prev,
        blocks: updated,
      };

      if (previous) {
        setFocusedBlockId(previous.id);
      }

      setLastAst(newAst);
      return newAst;
    });
  };

  const mergeWithPreviousBlock = (id: string, currentPlainText?: string) => {
    if (userRole === "commenter") return;

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
        content: [
          {
            type: "text",
            value: prevText + currText,
          },
        ],
        version: prevBlock.version + 1,
        updatedAt: new Date().toISOString(),
      };

      updated.splice(index, 1);

      const newAst: DocumentAST = {
        ...prev,
        blocks: updated,
      };

      setTimeout(() => {
        const prevBlockElement = document.querySelector(
          `[data-block-id="${prevBlock.id}"]`,
        ) as HTMLDivElement | null;

        if (!prevBlockElement) return;
        prevBlockElement.focus();

        const sel = window.getSelection();
        if (!sel) return;

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
      }, 0);

      setFocusedBlockId(prevBlock.id);
      setLastAst(newAst);
      return newAst;
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

    if (top + SLASH_MENU_MAX_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
      top = rect.top - SLASH_MENU_MAX_HEIGHT - 6;
    }
    if (top < VIEWPORT_PADDING) top = VIEWPORT_PADDING;

    if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
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
      if (!slashTargetId || userRole === "commenter") return;

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
            version: currentBlock.version + 1,
            updatedAt: new Date().toISOString(),
          };

          updated.splice(
            index + 1,
            0,
            {
              ...createBlock(type),
              id: mediaId,
              content: undefined,
              attrs: {
                src,
                width: type === "image" ? 100 : undefined,
              },
            },
            {
              ...createBlock("paragraph"),
              id: paragraphId,
            },
          );

          const newAst: DocumentAST = {
            ...prev,
            blocks: updated,
          };

          setFocusedBlockId(paragraphId);
          setLastAst(newAst);
          return newAst;
        });

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
          version: updated[index].version + 1,
          updatedAt: new Date().toISOString(),
        };

        const newAst: DocumentAST = {
          ...prev,
          blocks: updated,
        };

        setLastAst(newAst);
        return newAst;
      });

      setFocusedBlockId(slashTargetId);
    },
    [clearSlashMenu, slashTargetId, userRole],
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

  const applyFormat = (command: "bold" | "italic" | "link") => {
    if (userRole === "commenter") return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    let targetEl: HTMLElement | null = null;

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
      targetEl = a;
    } else {
      const tag = command === "bold" ? "strong" : "em";
      const el = document.createElement(tag);
      try {
        range.surroundContents(el);
      } catch {
        const contents = range.extractContents();
        el.appendChild(contents);
        range.insertNode(el);
      }
      targetEl = el;
    }

    if (targetEl) {
      const blockEl = targetEl.closest("[data-block-id]");
      if (blockEl) {
        const id = blockEl.getAttribute("data-block-id");
        if (id) {
          updateBlock(id, blockEl.innerHTML);
        }
      }
    }
  };

  const startResize = (e: React.MouseEvent, id: string) => {
    if (userRole === "commenter") return;

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
                version: b.version + 1,
                updatedAt: new Date().toISOString(),
              }
            : b,
        ),
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setAst((currentAst) => currentAst);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // ─── Collaborator / Invite functions ────────────────────────────────
  const addCollaborator = async () => {
    if (!postId || !collabUsername.trim()) return;

    // Creates a pending invite → recipient sees it on the Navbar bell
    const res = await fetch(
      `http://localhost:8080/api/posts/${postId}/invites`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: collabUsername.trim(),
          role: collabRole,
        }),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to send invite");
      return;
    }

    const data = await res.json();
    alert(data.message || "Invite sent successfully!");
    setCollabUsername("");
  };

  const removeCollaborator = async (username: string) => {
    if (!postId) return;
    const res = await fetch(
      `http://localhost:8080/api/posts/${postId}/collaborators`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      },
    );

    if (res.ok) {
      const data = await res.json();
      const post = extractPostFromData(data);
      setCollaborators(
        (post.collaborators || []).filter((c: Collaborator) => c?.user?._id),
      );
    }
  };

  const updateRole = async (username: string, role: "editor" | "commenter") => {
    if (!postId) return;
    const res = await fetch(
      `http://localhost:8080/api/posts/${postId}/collaborators/role`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, role }),
      },
    );

    if (res.ok) {
      const data = await res.json();
      const post = extractPostFromData(data);
      setCollaborators(
        (post.collaborators || []).filter((c: Collaborator) => c?.user?._id),
      );
    }
  };

  // ─── Slash menu keyboard ────────────────────────────────────────────
  useEffect(() => {
    if (!slashTargetId) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashOptions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i === 0 ? slashOptions.length - 1 : i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        insertBlock(slashOptions[slashIndex].type);
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearSlashMenu();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slashTargetId, slashIndex, slashOptions, insertBlock, clearSlashMenu]);

  // ─── Delete key for media blocks ────────────────────────────────────
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

  // ─── Click outside to close menus ───────────────────────────────────
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

  // ─── Clear format toolbar on selection collapse ─────────────────────
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

  // ─── Realtime collaboration (structured Yjs) ────────────────────────
  useEffect(() => {
    if (!postId || !collaborationEnabled) return;

    const yDoc = new Y.Doc();
    const yBlocks = yDoc.getArray<Y.Map<any>>("blocks");
    const provider = new WebsocketProvider(
      "ws://localhost:5000",
      `post-${postId}`,
      yDoc,
    );

    yDocRef.current = yDoc;
    yBlocksRef.current = yBlocks;
    providerRef.current = provider;

    const applyRemote = () => {
      if (isRemoteUpdate.current) return;
      isRemoteUpdate.current = true;

      const remoteBlocks: BlockNode[] = [];
      yBlocks.forEach((map) => {
        remoteBlocks.push(yMapToBlock(map));
      });

      const newAst: DocumentAST = {
        schemaVersion: DOCUMENT_SCHEMA_VERSION,
        blocks: remoteBlocks,
      };

      setAst(newAst);
      setLastAst(newAst);

      requestAnimationFrame(() => {
        isRemoteUpdate.current = false;
      });
    };

    yBlocks.observeDeep(applyRemote);

    // Seed shared document if empty
    if (yBlocks.length === 0) {
      yDoc.transact(() => {
        ast.blocks.forEach((b) => yBlocks.push([blockToYMap(b, yDoc)]));
      });
    } else {
      applyRemote();
    }

    // Awareness (online users + cursors)
    const awareness = provider.awareness;

    if (user?.username) {
      awareness.setLocalStateField("user", { name: user.username });
    }

    const updatePresence = () => {
      const states = Array.from(awareness.getStates().entries());

      const activeUsers = states
        .filter(([, s]) => s.user?.name)
        .map(([, s]) => s.user.name);
      setUsers([...new Set(activeUsers)]);

      const cursors: Record<string, { blockId: string; pos: number }> = {};
      states.forEach(([, s]) => {
        if (
          s.cursor &&
          s.user?.name &&
          s.user.name !== user?.username
        ) {
          cursors[s.user.name] = s.cursor;
        }
      });
      setRemoteCursors(cursors);
    };

    awareness.on("change", updatePresence);
    updatePresence();

    return () => {
      awareness.off("change", updatePresence);
      yBlocks.unobserveDeep(applyRemote);
      provider.destroy();
      yDoc.destroy();
      yDocRef.current = null;
      yBlocksRef.current = null;
      providerRef.current = null;
      setUsers([]);
      setRemoteCursors({});
    };
  }, [postId, collaborationEnabled, user?.username]);

  // ─── Push local AST → Yjs (only non-remote changes) ─────────────────
  useEffect(() => {
    if (
      !collaborationEnabled ||
      !yBlocksRef.current ||
      !yDocRef.current ||
      isRemoteUpdate.current
    )
      return;

    const yBlocks = yBlocksRef.current;
    const yDoc = yDocRef.current;

    yDoc.transact(() => {
      const localIds = new Set(ast.blocks.map((b) => b.id));

      // Remove deleted blocks
      for (let i = yBlocks.length - 1; i >= 0; i--) {
        const id = yBlocks.get(i).get("id");
        if (!localIds.has(id)) {
          yBlocks.delete(i, 1);
        }
      }

      // Upsert blocks
      ast.blocks.forEach((localBlock, idx) => {
        let yMap: Y.Map<any> | undefined;
        for (let i = 0; i < yBlocks.length; i++) {
          if (yBlocks.get(i).get("id") === localBlock.id) {
            yMap = yBlocks.get(i);
            break;
          }
        }

        if (!yMap) {
          yMap = blockToYMap(localBlock, yDoc);
          yBlocks.insert(idx, [yMap]);
        } else {
          yMap.set("type", localBlock.type);
          yMap.set("version", localBlock.version);
          yMap.set("updatedAt", localBlock.updatedAt);
          yMap.set("updatedBy", localBlock.updatedBy ?? "");
          if (localBlock.attrs) yMap.set("attrs", localBlock.attrs);

          const yText = yMap.get("content") as Y.Text;
          const desired =
            localBlock.content?.[0]?.type === "text"
              ? localBlock.content[0].value
              : "";

          if (yText.toString() !== desired) {
            yText.delete(0, yText.length);
            if (desired) yText.insert(0, desired);
          }
        }
      });
    });
  }, [ast, collaborationEnabled]);

  // ─── Load post on mount / when postId changes ───────────────────────
  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      const res = await fetch(`http://localhost:8080/api/posts/${postId}`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const data = await res.json();
      const post = extractPostFromData(data);

      setAst(post.document || ast);
      setLastAst(post.document || ast);
      setTags(post.tags || []);

      if (collaborationEnabled) {
        const collaboratorEntries = (post.collaborators || []).filter(
          (c: Collaborator) => c?.user?._id,
        );
        const { canManage, role } = resolveCollaborationPermissions(post);

        setCollaborators(collaboratorEntries);
        setCanManageCollaborators(canManage);
        setUserRole(role);
      }
    };

    fetchPost();
  }, [postId, collaborationEnabled]);

  // ─── Autosave ───────────────────────────────────────────────────────
  useEffect(() => {
    if (
      !postId ||
      !ast.blocks.length ||
      JSON.stringify(ast) === JSON.stringify(lastAst)
    )
      return;

    const timer = setTimeout(async () => {
      await fetch(`http://localhost:8080/api/posts/${postId}/autosave`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ document: ast }),
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [ast, postId, lastAst]);

  // ─── Cursor awareness ───────────────────────────────────────────────
  const handleBlockFocus = useCallback(
    (blockId: string, pos: number) => {
      if (!providerRef.current || !user?.username) return;
      providerRef.current.awareness.setLocalStateField("cursor", {
        blockId,
        pos,
      });
    },
    [user?.username],
  );

  // ─── Tags ───────────────────────────────────────────────────────────
  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        setTagInput("");
        if (postId) {
          await fetch(`http://localhost:8080/api/posts/${postId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ tags: newTags }),
          });
        }
      }
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    if (postId) {
      await fetch(`http://localhost:8080/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tags: newTags }),
      });
    }
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="max-w-170 mx-auto px-4 py-10 sm:py-16"
    >
      <div className="max-w-3xl mx-auto p-8">
        {/* Collaboration toggle */}
        <div className="mb-6 flex items-center justify-between gap-3">
          {!collaborationEnabled ? (
            <button
              type="button"
              onClick={enableCollaboration}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Enable Collaboration
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Collaboration: ON</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                {users.length} online
              </span>
              {userRole && (
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {userRole}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setCollaborationEnabled(false);
                  providerRef.current?.destroy();
                  yDocRef.current?.destroy();
                  providerRef.current = null;
                  yDocRef.current = null;
                  yBlocksRef.current = null;
                  setUsers([]);
                  setRemoteCursors({});
                }}
                className="text-red-500 hover:text-red-700"
              >
                Disable
              </button>
            </div>
          )}
        </div>

        {/* Collaborators Section */}
        {collaborationEnabled && (
          <div className="border p-4 mb-6 rounded">
            <h3 className="font-semibold mb-2">Collaborators</h3>

            {canManageCollaborators && (
              <div className="flex gap-2 mb-3">
                <input
                  placeholder="username"
                  value={collabUsername}
                  onChange={(e) => setCollabUsername(e.target.value)}
                  className="border px-2 py-1 flex-1"
                />
                <select
                  value={collabRole}
                  onChange={(e) =>
                    setCollabRole(e.target.value as "editor" | "commenter")
                  }
                  className="border px-2 py-1"
                >
                  <option value="editor">Editor</option>
                  <option value="commenter">Commenter</option>
                </select>
                <button
                  type="button"
                  disabled={!collabUsername.trim() || !postId}
                  onClick={addCollaborator}
                  className="bg-black text-white px-3 py-1 disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            )}

            <div className="space-y-1">
              {collaborators.length === 0 ? (
                <p className="text-gray-500 text-sm">No collaborators yet</p>
              ) : (
                collaborators.map((c) => (
                  <div
                    key={c.user._id}
                    className="flex justify-between items-center"
                  >
                    <span className="flex-1">{c.user.username}</span>
                    <span className="text-xs text-gray-500">({c.role})</span>
                    {canManageCollaborators && (
                      <>
                        <select
                          value={c.role}
                          onChange={(e) =>
                            updateRole(
                              c.user.username,
                              e.target.value as "editor" | "commenter",
                            )
                          }
                          className="border px-2 py-1 text-xs ml-2"
                        >
                          <option value="editor">Editor</option>
                          <option value="commenter">Commenter</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeCollaborator(c.user.username)}
                          className="text-red-500 ml-2 text-xs"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
                  className={`relative my-6 cursor-pointer ${
                    focusedBlockId === block.id ? "ring-2 ring-blue-400" : ""
                  }`}
                >
                  {focusedBlockId === block.id && userRole !== "commenter" && (
                    <div
                      className="absolute right-0 top-1/2 w-3 h-10 bg-blue-500 cursor-ew-resize"
                      onMouseDown={(e) => startResize(e, block.id)}
                    />
                  )}
                  <img
                    src={attrs?.src}
                    style={{ width: `${attrs?.width ?? 100}%` }}
                    className="rounded max-w-full"
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
              onCursorMove={(pos) => handleBlockFocus(block.id, pos)}
              remoteCursors={Object.entries(remoteCursors)
                .filter(([, cursor]) => cursor.blockId === block.id)
                .map(([username, cursor]) => ({
                  username,
                  pos: cursor.pos,
                }))}
              isFocused={focusedBlockId === block.id}
              isEditable={isEditable && userRole !== "commenter"}
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
                  } ${isCode ? "font-mono text-sm" : ""} ${
                    isHeading ? "text-base" : "text-sm"
                  }`}
                  onMouseEnter={() => setSlashIndex(i)}
                  onClick={() => insertBlock(opt.type)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Tags Section */}
        <div className="mb-6 mt-8 pt-6 border-t">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-1 border"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-red-500 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center transition-colors ml-1"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add a tag and press Enter..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="w-full sm:w-64 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={!isEditable || userRole === "commenter"}
          />
        </div>

        <div className="flex justify-end gap-3 mb-6">
          <button
            type="button"
            onClick={handlePublish}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            disabled={!extractTitleFromAST(ast).trim()}
          >
            Publish
          </button>
        </div>
      </div>
    </form>
  );
}