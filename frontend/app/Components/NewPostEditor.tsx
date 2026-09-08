"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";

import { useLiveblocksExtension } from "@liveblocks/react-tiptap";

import { EditorContent, useEditor } from "@tiptap/react";

import { BubbleMenu } from "@tiptap/react/menus";
import CollaborateModal from "../Components/CollaborationModal";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";

/* ============================================================
   CONFIG
============================================================ */

const MAX_CHARACTERS = 10000;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const POST_API = {
  create: `${API_BASE_URL}/posts`,

  createDraft: `${API_BASE_URL}/posts/draft`,

  getById: (postId: string) => `${API_BASE_URL}/posts/${postId}`,

  update: (postId: string) => `${API_BASE_URL}/posts/${postId}`,

  autosave: (postId: string) => `${API_BASE_URL}/posts/${postId}/autosave`,

  publish: (postId: string) => `${API_BASE_URL}/posts/${postId}/publish`,
};

/* ============================================================
   TYPES
============================================================ */

type HeadingLevel = 1 | 2 | 3;

type EditorDocument = {
  type: "doc";
  content?: any[];
};

type BackendDocument = {
  schemaVersion: number;
  blocks: any[];
};

type PostData = {
  _id?: string;

  title?: string;

  document?: BackendDocument;

  tags?: string[];

  canEdit?: boolean;

  currentUserRole?: "owner" | "editor" | "commenter";

  canManageCollaborators?: boolean;

  lastAutoSavedAt?: string;
};

type NewPostEditorProps = {
  postId?: string;

  initialTitle?: string;

  initialDocument?: EditorDocument;

  initialTags?: string[];

  canEdit?: boolean;

  currentUserRole?: string;

  canManageCollaborators?: boolean;

  onDocumentChange?: (document: EditorDocument) => void;

  onTitleChange?: (title: string) => void;

  onSave?: (post: PostData) => void;

  onError?: (error: Error) => void;

  onDraftCreated?: (post: PostData) => void;
};

type ApiResult<T = any> = {
  response: Response;
  data: T | null;
  rawText: string;
};

/* ============================================================
   DEFAULT DOCUMENT
============================================================ */

const EMPTY_DOCUMENT: EditorDocument = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

/* ============================================================
   DOCUMENT ADAPTER
============================================================ */

/**
 * Tiptap's internal JSON document does not contain
 * backend persistence metadata.
 *
 * MongoDB Post documents require:
 * document.schemaVersion
 *
 * Keep schemaVersion at the API boundary so Tiptap itself
 * continues to work with a normal ProseMirror/Tiptap document.
 */
const getBackendDocument = (editor: any): BackendDocument => {
  const tiptapDocument = editor.getJSON();

  return {
    schemaVersion: 1,
    blocks: Array.isArray(tiptapDocument.content) ? tiptapDocument.content : [],
  };
};

/**
 * Converts a document returned by the backend into the
 * normal Tiptap document expected by editor.commands.setContent().
 *
 * This prevents schemaVersion from being passed into Tiptap
 * as an unsupported top-level document property.
 */
const getTiptapDocument = (
  document?: Partial<BackendDocument> | null,
): EditorDocument => {
  if (!document) {
    return EMPTY_DOCUMENT;
  }

  const blocks = Array.isArray((document as any).blocks)
    ? (document as any).blocks
    : Array.isArray((document as any).content)
      ? (document as any).content
      : [];

  return {
    type: "doc",
    content: blocks,
  };
};

/* ============================================================
   API HELPER
============================================================ */

/**
 * Centralized API request helper.
 *
 * This is intentionally verbose while debugging so that
 * backend errors are never hidden behind generic messages.
 */
const apiRequest = async <T = any,>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> => {
  console.log("[API REQUEST]", options.method || "GET", url);

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,

      credentials: "include",

      headers: {
        Accept: "application/json",
        ...(options.body
          ? {
              "Content-Type": "application/json",
            }
          : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error("[API NETWORK ERROR]", error);

    throw new Error(
      `Unable to connect to the backend at ${url}. ` +
        `Make sure your Express server is running.`,
    );
  }

  const rawText = await response.text();

  let data: T | null = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  console.log("[API RESPONSE]", response.status, response.statusText, url);

  console.log("[API RESPONSE BODY]", data ?? rawText);

  if (!response.ok) {
    let backendMessage = "";

    if (data && typeof data === "object") {
      const body = data as any;

      backendMessage =
        body.message || body.error || body.errors?.[0]?.message || "";
    }

    if (!backendMessage) {
      backendMessage = rawText.trim();
    }

    if (!backendMessage) {
      backendMessage =
        response.statusText || `Request failed with status ${response.status}`;
    }

    let prefix = "Request failed";

    switch (response.status) {
      case 400:
        prefix = "Bad request";
        break;

      case 401:
        prefix = "Authentication required";
        break;

      case 403:
        prefix = "Permission denied";
        break;

      case 404:
        prefix = "API route not found";
        break;

      case 409:
        prefix = "Conflict";
        break;

      case 422:
        prefix = "Validation failed";
        break;

      case 500:
        prefix = "Backend server error";
        break;

      case 502:
      case 503:
      case 504:
        prefix = "Backend unavailable";
        break;
    }

    throw new Error(`${prefix} (${response.status}): ${backendMessage}`);
  }

  return {
    response,
    data,
    rawText,
  };
};

/* ============================================================
   COMPONENT
============================================================ */

type TiptapCoreProps = NewPostEditorProps & {
  liveblocksExtension?: ReturnType<typeof useLiveblocksExtension>;
};

const Tiptap = ({
  postId,
  initialTitle = "",
  initialDocument = EMPTY_DOCUMENT,
  initialTags = [],
  canEdit = true,
  currentUserRole,
  canManageCollaborators = false,
  onDocumentChange,
  onTitleChange,
  onSave,
  onError,
  onDraftCreated,
  liveblocksExtension,
}: TiptapCoreProps) => {
  /* ==========================================================
     STATE
  ========================================================== */

  const [isMounted, setIsMounted] = useState(false);

  const [title, setTitle] = useState(initialTitle);

  const [tags, setTags] = useState<string[]>(initialTags);

  const [tagInput, setTagInput] = useState("");

  const [saving, setSaving] = useState(false);

  const [creatingDraft, setCreatingDraft] = useState(false);

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);

  /* ==========================================================
   COLLABORATION
========================================================== */

  const [collaborationModalOpen, setCollaborationModalOpen] = useState(false);

  /*
   * New posts do not have a postId until the first collaboration
   * attempt creates an unpublished draft. Keep that ID locally so
   * the modal can open immediately after draft creation.
   */
  const [draftPostId, setDraftPostId] = useState<string | null>(null);

  const effectivePostId = postId || draftPostId;

  /* ==========================================================
     MOUNT
  ========================================================== */

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /* ==========================================================
     EDITOR
  ========================================================== */

  const editor = useEditor({
    extensions: [
      // Liveblocks collaboration extension
      ...(liveblocksExtension ? [liveblocksExtension] : []),

      // Core Tiptap extensions
      StarterKit.configure({
        undoRedo: liveblocksExtension ? false : undefined,

        heading: {
          levels: [1, 2, 3],
        },

        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },

        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),

      // Text formatting
      Underline,

      TextStyle,

      Color,

      Highlight.configure({
        multicolor: true,
      }),

      // Alignment
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),

      // Script formatting
      Subscript,

      Superscript,

      // Links
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
      }),

      // Placeholder
      Placeholder.configure({
        placeholder: "Write something beautiful...",
      }),

      // Character limit
      CharacterCount.configure({
        limit: MAX_CHARACTERS,
      }),
    ],

    content: initialDocument,

    immediatelyRender: false,

    editable: canEdit,

    editorProps: {
      attributes: {
        class: "ProseMirror focus:outline-none min-h-[450px] leading-8",
      },
    },

    onUpdate: ({ editor }) => {
      const document = editor.getJSON() as EditorDocument;

      onDocumentChange?.(document);
    },
  });

  /* ==========================================================
     EDITABLE STATE
  ========================================================== */

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(canEdit);
  }, [editor, canEdit]);

  /* ==========================================================
     LOAD EXISTING POST
  ========================================================== */

  useEffect(() => {
    if (!editor || !effectivePostId) {
      return;
    }

    let cancelled = false;

    const loadPost = async () => {
      try {
        setLoadError(null);

        const result = await apiRequest<PostData>(
          POST_API.getById(effectivePostId),
          {
            method: "GET",
          },
        );

        if (cancelled) return;

        const post = result.data;

        if (!post) {
          throw new Error("Backend returned an empty post response.");
        }

        if (post.document) {
          editor.commands.setContent(getTiptapDocument(post.document));
        }

        if (post.title !== undefined) {
          setTitle(post.title);
        }

        if (post.tags) {
          setTags(post.tags);
        }

        if (post.lastAutoSavedAt) {
          setLastSaved(post.lastAutoSavedAt);
        }
      } catch (error) {
        if (cancelled) return;

        const normalizedError =
          error instanceof Error ? error : new Error("Failed to load post.");

        console.error("[LOAD POST ERROR]", normalizedError);

        setLoadError(normalizedError.message);

        onError?.(normalizedError);
      }
    };

    loadPost();

    return () => {
      cancelled = true;
    };
  }, [editor, effectivePostId, onError]);

  /* ==========================================================
     SAVE DOCUMENT / AUTOSAVE
  ========================================================== */

  const saveDocument = async (showSavingState = true) => {
    if (!editor) return;

    if (!effectivePostId) {
      return;
    }

    if (!canEdit) {
      return;
    }

    try {
      if (showSavingState) {
        setSaveStatus("saving");
      }

      setSaveError(null);

      const document = getBackendDocument(editor);

      const result = await apiRequest<any>(POST_API.autosave(effectivePostId), {
        method: "PATCH",

        body: JSON.stringify({
          document,
        }),
      });

      const data = result.data;

      const savedTime =
        data?.lastSaved || data?.lastAutoSavedAt || new Date().toISOString();

      setLastSaved(savedTime);

      setSaveStatus("saved");

      onSave?.(data?.post || data);
    } catch (error) {
      setSaveStatus("error");

      const normalizedError =
        error instanceof Error ? error : new Error("Autosave failed.");

      console.error("[AUTOSAVE ERROR]", normalizedError);

      setSaveError(normalizedError.message);

      onError?.(normalizedError);
    }
  };

  /* ==========================================================
     DEBOUNCED AUTOSAVE
  ========================================================== */

  useEffect(() => {
    if (!editor) return;
    if (!postId) return;
    if (!canEdit) return;

    const timeout = window.setTimeout(() => {
      saveDocument();
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [editor, effectivePostId, canEdit, editor?.state.doc.content.size]);

  /* ==========================================================
     TITLE
  ========================================================== */

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setTitle(value);

    onTitleChange?.(value);
  };

  /* ==========================================================
     CREATE POST
  ========================================================== */

  const createPost = async () => {
    if (!editor) {
      throw new Error("Editor is not initialized.");
    }

    if (!title.trim()) {
      throw new Error("Title is required.");
    }

    const document = getBackendDocument(editor);

    const payload = {
      title: title.trim(),
      document,
      tags,
    };

    console.log("======================================");

    console.log("[CREATE POST]");

    console.log("URL:", POST_API.create);

    console.log("PAYLOAD:", payload);

    console.log("======================================");

    const result = await apiRequest<any>(POST_API.create, {
      method: "POST",

      body: JSON.stringify(payload),
    });

    const data = result.data;

    if (!data) {
      throw new Error(
        "Post was created, but the backend returned an empty response.",
      );
    }

    const savedPost = data?.post || data?.data || data;

    console.log("[CREATE POST SUCCESS]", savedPost);

    onSave?.(savedPost);

    return data;
  };

  const createDraft = async () => {
    if (!editor) {
      throw new Error("Editor is not initialized.");
    }

    if (!canEdit) {
      throw new Error("You do not have permission to create a draft.");
    }

    const document = getBackendDocument(editor);

    const payload = {
      title: title.trim() || "Untitled draft",

      document,

      tags,
    };

    console.log("[CREATE DRAFT]", payload);

    const result = await apiRequest<any>(POST_API.createDraft, {
      method: "POST",

      body: JSON.stringify(payload),
    });

    const data = result.data;

    if (!data) {
      throw new Error("Draft was created but the backend returned no data.");
    }

    const savedDraft = data?.post || data?.data || data;

    const draftId = savedDraft?._id || savedDraft?.id;

    if (!draftId) {
      throw new Error("Draft was created but no post ID was returned.");
    }

    console.log("[CREATE DRAFT SUCCESS]", savedDraft);

    setDraftPostId(draftId);

    onDraftCreated?.(savedDraft);

    return savedDraft;
  };

  /* ==========================================================
     UPDATE POST
  ========================================================== */

  const updatePost = async () => {
    if (!editor) {
      throw new Error("Editor is not initialized.");
    }

    if (!effectivePostId) {
      throw new Error("Post ID is missing.");
    }

    if (!canEdit) {
      throw new Error("You do not have permission to edit this post.");
    }

    if (!title.trim()) {
      throw new Error("Title is required.");
    }

    const document = getBackendDocument(editor);

    const payload = {
      title: title.trim(),
      document,
      tags,
    };

    console.log("[UPDATE POST]", {
      url: POST_API.update(effectivePostId),
      payload,
    });

    const result = await apiRequest<any>(POST_API.update(effectivePostId), {
      method: "PATCH",

      body: JSON.stringify(payload),
    });

    const data = result.data;

    const savedPost = data?.post || data?.data || data;

    setSaveStatus("saved");

    setSaveError(null);

    onSave?.(savedPost);

    return data;
  };

  /* ==========================================================
     MANUAL SAVE
  ========================================================== */

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);

      setSaveStatus("saving");

      setSaveError(null);

      if (effectivePostId) {
        await updatePost();
      } else {
        await createPost();
      }

      setSaveStatus("saved");

      setSaveError(null);
    } catch (error) {
      setSaveStatus("error");

      const normalizedError =
        error instanceof Error ? error : new Error("Failed to save post.");

      console.error("======================================");

      console.error("SAVE POST ERROR");

      console.error(normalizedError);

      console.error("======================================");

      setSaveError(normalizedError.message);

      onError?.(normalizedError);
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================
     TAGS
  ========================================================== */

  const addTag = () => {
    const tag = tagInput.trim();

    if (!tag) return;

    if (tags.includes(tag)) {
      setTagInput("");
      return;
    }

    setTags((previous) => [...previous, tag]);

    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((previous) => previous.filter((item) => item !== tag));
  };

  /* ==========================================================
     LINK
  ========================================================== */

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href || "";

    const url = window.prompt("Enter URL", previousUrl);

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

    let finalUrl = url.trim();

    if (
      !finalUrl.startsWith("http://") &&
      !finalUrl.startsWith("https://") &&
      !finalUrl.startsWith("mailto:")
    ) {
      finalUrl = `https://${finalUrl}`;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: finalUrl,
      })
      .run();
  };

  const removeLink = () => {
    if (!editor) return;

    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  };

  /* ==========================================================
     HEADINGS
  ========================================================== */

  const setHeading = (level: HeadingLevel) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .toggleHeading({
        level,
      })
      .run();
  };

  /* ==========================================================
     LISTS
  ========================================================== */

  const toggleBulletList = () => {
    if (!editor) return;

    editor.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    if (!editor) return;

    editor.chain().focus().toggleOrderedList().run();
  };

  /* ==========================================================
     COLORS
  ========================================================== */

  const setTextColor = (color: string) => {
    if (!editor) return;

    editor.chain().focus().setColor(color).run();
  };

  const resetTextColor = () => {
    if (!editor) return;

    editor.chain().focus().unsetColor().run();
  };

  /* ==========================================================
     HIGHLIGHT
  ========================================================== */

  const setHighlight = (color: string) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .toggleHighlight({
        color,
      })
      .run();
  };

  /* ==========================================================
     CLEAR FORMATTING
  ========================================================== */

  const clearFormatting = () => {
    if (!editor) return;

    editor.chain().focus().clearNodes().unsetAllMarks().run();
  };

  /* ==========================================================
     TOOLBAR BUTTON
  ========================================================== */

  const ToolbarButton = ({
    onClick,
    active = false,
    disabled = false,
    label,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    label: string;
    children: React.ReactNode;
  }) => {
    const isDisabled = disabled || !canEdit;

    return (
      <button
        type="button"
        disabled={isDisabled}
        title={label}
        aria-label={label}
        onMouseDown={(event) => {
          event.preventDefault();

          if (isDisabled) {
            return;
          }

          onClick();
        }}
        className={`
        flex
        items-center
        justify-center
        w-9
        h-9
        rounded-md
        shrink-0
        transition-all

        ${
          active
            ? "bg-black text-white"
            : "text-gray-600 hover:bg-gray-100 hover:text-black"
        }

        ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}

        focus:outline-none
        focus:ring-2
        focus:ring-gray-300
      `}
      >
        {children}
      </button>
    );
  };

  /* ==========================================================
     DIVIDER
  ========================================================== */

  const ToolbarDivider = () => (
    <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
  );

  /* ==========================================================
     CURRENT BLOCK
  ========================================================== */

  const currentBlock = useMemo(() => {
    if (!editor) {
      return "Paragraph";
    }

    if (
      editor.isActive("heading", {
        level: 1,
      })
    ) {
      return "Heading 1";
    }

    if (
      editor.isActive("heading", {
        level: 2,
      })
    ) {
      return "Heading 2";
    }

    if (
      editor.isActive("heading", {
        level: 3,
      })
    ) {
      return "Heading 3";
    }

    if (editor.isActive("bulletList")) {
      return "Bullet list";
    }

    if (editor.isActive("orderedList")) {
      return "Numbered list";
    }

    if (editor.isActive("blockquote")) {
      return "Blockquote";
    }

    if (editor.isActive("codeBlock")) {
      return "Code block";
    }

    return "Paragraph";
  }, [editor]);

  /* ==========================================================
     COUNTERS
  ========================================================== */

  const characters = editor?.storage.characterCount?.characters?.() || 0;

  const words = editor?.storage.characterCount?.words?.() || 0;

  /* ==========================================================
     LOADING
  ========================================================== */

  if (!isMounted || !editor) {
    return null;
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* =====================================================
          POST HEADER
      ====================================================== */}

      <div className="mb-4">
        {/* TITLE */}

        <div className="flex items-start gap-4">
          <input
            value={title}
            onChange={handleTitleChange}
            disabled={!canEdit}
            placeholder="Post title"
            className="
        flex-1
        w-full
        text-4xl
        md:text-5xl
        font-bold
        border-none
        outline-none
        placeholder:text-gray-300
        disabled:cursor-not-allowed
        disabled:bg-transparent
      "
          />

          {canEdit && (
            <button
              type="button"
              disabled={creatingDraft}
              onClick={async () => {
                try {
                  setCreatingDraft(true);
                  setSaveError(null);

                  /*
                   * Existing post:
                   * directly open collaboration modal.
                   */
                  if (effectivePostId) {
                    setCollaborationModalOpen(true);
                    return;
                  }

                  /*
                   * New post:
                   * first create an unpublished draft.
                   */
                  await createDraft();

                  /*
                   * Parent will receive the new
                   * post ID through onDraftCreated.
                   */
                  setCollaborationModalOpen(true);
                } catch (error) {
                  const normalizedError =
                    error instanceof Error
                      ? error
                      : new Error("Failed to prepare collaboration.");

                  console.error(
                    "[COLLABORATION PREPARATION ERROR]",
                    normalizedError,
                  );

                  setSaveError(normalizedError.message);

                  onError?.(normalizedError);
                } finally {
                  setCreatingDraft(false);
                }
              }}
              className="
      shrink-0
      mt-2
      flex
      items-center
      gap-2
      px-4
      py-2
      rounded-lg
      border
      border-gray-200
      bg-white
      text-sm
      font-medium
      text-gray-700
      hover:bg-gray-50
      hover:border-gray-300
      transition
      disabled:opacity-50
      disabled:cursor-not-allowed
    "
            >
              <UserPlus size={16} />

              {creatingDraft ? "Preparing..." : "Collaborate"}
            </button>
          )}
        </div>

        {/* TAGS */}

        <div className="flex flex-wrap gap-2 mt-4">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={!canEdit}
              onClick={() => removeTag(tag)}
              className="
                px-3
                py-1
                text-sm
                bg-gray-100
                text-gray-700
                rounded-full
                hover:bg-gray-200
                disabled:opacity-50
              "
              title="Remove tag"
            >
              #{tag} ×
            </button>
          ))}

          {canEdit && (
            <div className="flex items-center gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag"
                className="
                  w-28
                  px-2
                  py-1
                  text-sm
                  border
                  border-gray-200
                  rounded-md
                  outline-none
                  focus:border-gray-400
                "
              />

              <button
                type="button"
                onClick={addTag}
                className="
                  px-2
                  py-1
                  text-sm
                  border
                  border-gray-200
                  rounded-md
                  hover:bg-gray-50
                "
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* ROLE */}

        {currentUserRole && (
          <div className="mt-3 text-xs text-gray-400">
            Role: {currentUserRole}
          </div>
        )}

        {/* LOAD ERROR */}

        {loadError && (
          <div
            className="
              mt-3
              px-3
              py-2
              rounded-md
              bg-red-50
              border
              border-red-100
              text-red-600
              text-sm
            "
          >
            {loadError}
          </div>
        )}

        {/* SAVE ERROR */}

        {saveError && (
          <div
            className="
              mt-3
              px-3
              py-2
              rounded-md
              bg-red-50
              border
              border-red-100
              text-red-700
              text-sm
              break-words
            "
          >
            <strong>Save failed:</strong> {saveError}
          </div>
        )}
      </div>

      {/* =====================================================
          EDITOR CARD
      ====================================================== */}

      <div
        className="
          bg-white
          border
          border-gray-200
          rounded-xl
          shadow-sm
          overflow-hidden
        "
      >
        {/* ===================================================
            TOOLBAR
        ==================================================== */}

        <div
          className="
            sticky
            top-0
            z-20
            flex
            items-center
            gap-1
            flex-wrap
            px-3
            py-2
            bg-white/95
            backdrop-blur
            border-b
            border-gray-200
          "
        >
          {/* UNDO */}

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            label="Undo"
          >
            <Undo2 size={17} />
          </ToolbarButton>

          {/* REDO */}

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            label="Redo"
          >
            <Redo2 size={17} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* BOLD */}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            label="Bold"
          >
            <Bold size={17} />
          </ToolbarButton>

          {/* ITALIC */}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            label="Italic"
          >
            <Italic size={17} />
          </ToolbarButton>

          {/* UNDERLINE */}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            label="Underline"
          >
            <UnderlineIcon size={17} />
          </ToolbarButton>

          {/* STRIKE */}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            label="Strikethrough"
          >
            <Strikethrough size={17} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* H1 */}

          <ToolbarButton
            onClick={() => setHeading(1)}
            active={editor.isActive("heading", { level: 1 })}
            label="Heading 1"
          >
            <Heading1 size={17} />
          </ToolbarButton>

          {/* H2 */}

          <ToolbarButton
            onClick={() => setHeading(2)}
            active={editor.isActive("heading", { level: 2 })}
            label="Heading 2"
          >
            <Heading2 size={17} />
          </ToolbarButton>

          {/* H3 */}

          <ToolbarButton
            onClick={() => setHeading(3)}
            active={editor.isActive("heading", { level: 3 })}
            label="Heading 3"
          >
            <Heading3 size={17} />
          </ToolbarButton>

          {/* PARAGRAPH */}

          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={editor.isActive("paragraph")}
            label="Paragraph"
          >
            <Pilcrow size={17} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* BULLET LIST */}

          <ToolbarButton
            onClick={toggleBulletList}
            active={editor.isActive("bulletList")}
            label="Bullet list"
          >
            <List size={18} />
          </ToolbarButton>

          {/* NUMBERED LIST */}

          <ToolbarButton
            onClick={toggleOrderedList}
            active={editor.isActive("orderedList")}
            label="Numbered list"
          >
            <ListOrdered size={18} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* BLOCKQUOTE */}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            label="Blockquote"
          >
            <Quote size={17} />
          </ToolbarButton>

          {/* CODE BLOCK */}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            label="Code block"
          >
            <Code size={17} />
          </ToolbarButton>

          {/* INLINE CODE */}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            label="Inline code"
          >
            <Code2 size={17} />
          </ToolbarButton>

          {/* HR */}

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            label="Horizontal divider"
          >
            <Minus size={17} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* ALIGN LEFT */}

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({
              textAlign: "left",
            })}
            label="Align left"
          >
            <AlignLeft size={17} />
          </ToolbarButton>

          {/* ALIGN CENTER */}

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({
              textAlign: "center",
            })}
            label="Align center"
          >
            <AlignCenter size={17} />
          </ToolbarButton>

          {/* ALIGN RIGHT */}

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({
              textAlign: "right",
            })}
            label="Align right"
          >
            <AlignRight size={17} />
          </ToolbarButton>

          {/* JUSTIFY */}

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            active={editor.isActive({
              textAlign: "justify",
            })}
            label="Justify"
          >
            <AlignJustify size={17} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* LINK */}

          <ToolbarButton
            onClick={setLink}
            active={editor.isActive("link")}
            label="Add link"
          >
            <LinkIcon size={17} />
          </ToolbarButton>

          {/* UNLINK */}

          {editor.isActive("link") && (
            <ToolbarButton onClick={removeLink} label="Remove link">
              <Unlink size={17} />
            </ToolbarButton>
          )}

          <ToolbarDivider />

          {/* SUPERSCRIPT */}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            active={editor.isActive("superscript")}
            label="Superscript"
          >
            <SuperscriptIcon size={17} />
          </ToolbarButton>

          {/* SUBSCRIPT */}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            active={editor.isActive("subscript")}
            label="Subscript"
          >
            <SubscriptIcon size={17} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* HIGHLIGHT */}

          <ToolbarButton
            onClick={() => setHighlight("#fef08a")}
            active={editor.isActive("highlight")}
            label="Highlight"
          >
            <Highlighter size={17} />
          </ToolbarButton>

          {/* COLOR */}

          <div className="relative group">
            <ToolbarButton
              onClick={() => setTextColor("#ef4444")}
              label="Text color"
            >
              <Palette size={17} />
            </ToolbarButton>

            <div
              className="
                absolute
                top-10
                left-0
                hidden
                group-hover:flex
                bg-white
                border
                border-gray-200
                shadow-lg
                rounded-lg
                p-2
                gap-1
                z-50
              "
            >
              {[
                "#000000",
                "#ef4444",
                "#f97316",
                "#eab308",
                "#22c55e",
                "#3b82f6",
                "#8b5cf6",
                "#ec4899",
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setTextColor(color)}
                  className="
                      w-6
                      h-6
                      rounded-full
                      border
                      border-gray-200
                    "
                  style={{
                    backgroundColor: color,
                  }}
                />
              ))}

              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={resetTextColor}
                className="
                  w-6
                  h-6
                  rounded-full
                  border
                  border-gray-300
                  flex
                  items-center
                  justify-center
                  text-xs
                "
              >
                ×
              </button>
            </div>
          </div>

          <ToolbarDivider />

          {/* CLEAR FORMAT */}

          <ToolbarButton onClick={clearFormatting} label="Clear formatting">
            <RemoveFormatting size={17} />
          </ToolbarButton>
        </div>

        {/* ===================================================
            BUBBLE MENU
        ==================================================== */}

        <BubbleMenu
          editor={editor}
          options={{
            placement: "top",
            offset: 8,
          }}
        >
          <div
            className="
              flex
              items-center
              gap-1
              bg-black
              text-white
              rounded-lg
              shadow-xl
              px-2
              py-1
            "
          >
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="p-2 rounded hover:bg-white/10"
            >
              <Bold size={15} />
            </button>

            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className="p-2 rounded hover:bg-white/10"
            >
              <Italic size={15} />
            </button>

            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className="p-2 rounded hover:bg-white/10"
            >
              <UnderlineIcon size={15} />
            </button>

            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={setLink}
              className="p-2 rounded hover:bg-white/10"
            >
              <LinkIcon size={15} />
            </button>

            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setHighlight("#fef08a")}
              className="p-2 rounded hover:bg-white/10"
            >
              <Highlighter size={15} />
            </button>
          </div>
        </BubbleMenu>

        {/* ===================================================
            EDITOR
        ==================================================== */}

        <div
          className="
            px-6
            sm:px-10
            md:px-14
            py-8
            min-h-[500px]
            prose
            prose-lg
            max-w-none

            prose-headings:font-semibold
            prose-headings:text-gray-900

            prose-p:text-gray-800
            prose-p:leading-8

            prose-ul:my-4
            prose-ol:my-4
            prose-li:my-1

            [&_.ProseMirror_ul]:list-disc
            [&_.ProseMirror_ul]:pl-6

            [&_.ProseMirror_ol]:list-decimal
            [&_.ProseMirror_ol]:pl-6

            [&_.ProseMirror_li]:pl-1

            [&_.ProseMirror_ul_ul]:list-[circle]
            [&_.ProseMirror_ul_ul]:pl-6

            [&_.ProseMirror_ul_ul_ul]:list-[square]

            prose-blockquote:border-l-4
            prose-blockquote:border-gray-300
            prose-blockquote:pl-5
            prose-blockquote:italic

            prose-code:bg-gray-100
            prose-code:px-1
            prose-code:py-0.5
            prose-code:rounded
            prose-code:text-sm

            [&_.ProseMirror]:outline-none
            [&_.ProseMirror]:min-h-[450px]

            [&_.ProseMirror_h1]:text-4xl
            [&_.ProseMirror_h1]:font-bold
            [&_.ProseMirror_h1]:leading-tight

            [&_.ProseMirror_h2]:text-3xl
            [&_.ProseMirror_h2]:font-bold
            [&_.ProseMirror_h2]:leading-tight

            [&_.ProseMirror_h3]:text-2xl
            [&_.ProseMirror_h3]:font-semibold
            [&_.ProseMirror_h3]:leading-tight

            [&_.ProseMirror_a]:text-blue-600
            [&_.ProseMirror_a]:underline
            [&_.ProseMirror_a]:cursor-pointer

            [&_.ProseMirror_pre]:bg-gray-950
            [&_.ProseMirror_pre]:text-gray-100
            [&_.ProseMirror_pre]:rounded-lg
            [&_.ProseMirror_pre]:p-4
            [&_.ProseMirror_pre]:overflow-x-auto

            [&_.ProseMirror_mark]:rounded
            [&_.ProseMirror_mark]:px-1

            [&_.ProseMirror_img]:rounded-lg
            [&_.ProseMirror_img]:max-w-full
          "
        >
          <EditorContent editor={editor} />
        </div>

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-3
            px-4
            py-3
            border-t
            border-gray-100
            text-xs
            text-gray-400
          "
        >
          <div className="flex gap-4">
            <span>
              {words} {words === 1 ? "word" : "words"}
            </span>

            <span>
              {characters} / {MAX_CHARACTERS} characters
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>{currentBlock}</span>

            {saveStatus === "saving" && (
              <span className="text-gray-500">Saving...</span>
            )}

            {saveStatus === "saved" && (
              <span className="text-green-600">Saved</span>
            )}

            {saveStatus === "error" && (
              <span className="text-red-500">Save failed</span>
            )}

            {lastSaved && (
              <span>{new Date(lastSaved).toLocaleTimeString()}</span>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="
                  px-4
                  py-2
                  rounded-md
                  bg-black
                  text-white
                  hover:bg-gray-800
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                {saving ? "Saving..." : effectivePostId ? "Save" : "Publish"}
              </button>
            )}
          </div>
        </div>
      </div>

      {collaborationModalOpen && effectivePostId && (
        <CollaborateModal
          postId={effectivePostId}
          onClose={() => setCollaborationModalOpen(false)}
          onInvited={() => {
            console.log("[COLLABORATION] Invitation sent");
          }}
        />
      )}

      {/* =====================================================
          READ ONLY
      ====================================================== */}

      {!canEdit && (
        <div
          className="
            mt-3
            text-sm
            text-gray-500
            text-center
          "
        >
          You have read-only access to this document.
        </div>
      )}
    </div>
  );
};

/* ============================================================
   LIVEBLOCKS COLLABORATION BRIDGE
============================================================ */

const LiveblocksTiptapBridge = (props: NewPostEditorProps) => {
  const liveblocksExtension = useLiveblocksExtension({
    collaborationMode: "liveblocks",
    field: "document",
    initialContent: props.initialDocument || EMPTY_DOCUMENT,
    comments: false,
    mentions: false,
  });

  return <Tiptap {...props} liveblocksExtension={liveblocksExtension} />;
};

/* ============================================================
   PUBLIC EDITOR
============================================================ */

const NewPostEditor = (props: NewPostEditorProps) => {
  /*
   * A new post starts without an ID. The first collaboration attempt
   * creates an unpublished draft and returns its ID through
   * onDraftCreated. Once that ID exists, mount the Liveblocks room.
   */
  const [activePostId, setActivePostId] = useState<string | undefined>(
    props.postId,
  );

  const [activeInitialDocument, setActiveInitialDocument] =
    useState<EditorDocument>(props.initialDocument || EMPTY_DOCUMENT);

  useEffect(() => {
    if (props.postId) {
      setActivePostId(props.postId);
    }
  }, [props.postId]);

  const handleDraftCreated = (post: PostData) => {
    const newPostId = post?._id;

    if (newPostId) {
      setActivePostId(newPostId);
    }

    if (post?.document) {
      setActiveInitialDocument(getTiptapDocument(post.document));
    }

    props.onDraftCreated?.(post);
  };

  const editorProps: NewPostEditorProps = {
    ...props,
    postId: activePostId,
    initialDocument: activeInitialDocument,
    onDraftCreated: handleDraftCreated,
  };

  /*
   * Until the backend creates the draft there is no stable room ID,
   * so use a normal Tiptap editor.
   */
  if (!activePostId) {
    return <Tiptap {...editorProps} />;
  }

  const authEndpoint = async (room?: string) => {
    const response = await fetch("http://localhost:8080/api/liveblocks/auth", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          `Liveblocks authentication failed (${response.status})`,
      );
    }

    return data;
  };

  return (
    <LiveblocksProvider authEndpoint={authEndpoint}>
      <RoomProvider id={`post:${activePostId}`}>
        <ClientSideSuspense
          fallback={
            <div className="w-full max-w-5xl mx-auto">
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
                Connecting to realtime collaboration...
              </div>
            </div>
          }
        >
          <LiveblocksTiptapBridge {...editorProps} />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
};
export default NewPostEditor;
