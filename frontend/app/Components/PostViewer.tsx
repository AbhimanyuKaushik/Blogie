"use client";

import { Post, BlockNode, ImageAttrs } from "../Types/PostTypes";

export function getVideoEmbedUrl(url: string) {
  if (!url) return "";

  const trimmed = url.trim();

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );

  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);

  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmed;
}

/* ============================================================
   TYPES
============================================================ */

type TiptapMark = {
  type: string;
  attrs?: Record<string, any>;
};

type TiptapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

interface PostViewerProps {
  post: Post;
}

/* ============================================================
   TEXT RENDERER
============================================================ */

function renderTextNode(node: TiptapNode, key: string) {
  let content: React.ReactNode = node.text ?? "";

  const marks = node.marks ?? [];

  marks.forEach((mark, index) => {
    const markKey = `${key}-mark-${index}`;

    switch (mark.type) {
      case "bold":
        content = <strong key={markKey}>{content}</strong>;
        break;

      case "italic":
        content = <em key={markKey}>{content}</em>;
        break;

      case "underline":
        content = <u key={markKey}>{content}</u>;
        break;

      case "strike":
        content = <s key={markKey}>{content}</s>;
        break;

      case "code":
        content = (
          <code
            key={markKey}
            className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em]"
          >
            {content}
          </code>
        );
        break;

      case "highlight":
        content = (
          <mark
            key={markKey}
            className="rounded px-1"
            style={{
              backgroundColor: mark.attrs?.color || "#fef08a",
            }}
          >
            {content}
          </mark>
        );
        break;

      case "textStyle":
        if (mark.attrs?.color) {
          content = (
            <span
              key={markKey}
              style={{
                color: mark.attrs.color,
              }}
            >
              {content}
            </span>
          );
        }
        break;

      case "link":
        if (mark.attrs?.href) {
          content = (
            <a
              key={markKey}
              href={mark.attrs.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              {content}
            </a>
          );
        }
        break;

      default:
        break;
    }
  });

  return <span key={key}>{content}</span>;
}

/* ============================================================
   INLINE CONTENT
============================================================ */

function renderInlineContent(content: TiptapNode[] | undefined) {
  if (!content?.length) {
    return null;
  }

  return content.map((node, index) => {
    const key = `inline-${index}`;

    if (node.type === "text") {
      return renderTextNode(node, key);
    }

    if (node.type === "hardBreak") {
      return <br key={key} />;
    }

    return <span key={key}>{renderNodeContent(node)}</span>;
  });
}

/* ============================================================
   NODE CONTENT
============================================================ */

function renderNodeContent(node: TiptapNode): React.ReactNode {
  return renderInlineContent(node.content);
}

/* ============================================================
   LIST RENDERER
============================================================ */

function renderList(node: TiptapNode, index: number) {
  const items = node.content ?? [];

  if (node.type === "bulletList") {
    return (
      <ul
        key={`bullet-list-${index}`}
        className="my-5 ml-7 list-disc space-y-2 text-[1.125rem] leading-[1.6] text-gray-800"
      >
        {items.map((item, itemIndex) => (
          <li key={`bullet-item-${itemIndex}`}>
            {item.content?.map((child, childIndex) => (
              <div key={`bullet-child-${childIndex}`}>
                {renderInlineContent(child.content)}
              </div>
            ))}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ol
      key={`ordered-list-${index}`}
      className="my-5 ml-7 list-decimal space-y-2 text-[1.125rem] leading-[1.6] text-gray-800"
    >
      {items.map((item, itemIndex) => (
        <li key={`ordered-item-${itemIndex}`}>
          {item.content?.map((child, childIndex) => (
            <div key={`ordered-child-${childIndex}`}>
              {renderInlineContent(child.content)}
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}

/* ============================================================
   MAIN BLOCK RENDERER
============================================================ */

function renderBlock(block: BlockNode, index: number): React.ReactNode {
  const node = block as unknown as TiptapNode;

  const key = (block as any).id ?? `${block.type}-${index}`;

  switch (node.type) {
    /* --------------------------------------------------------
       PARAGRAPH
    -------------------------------------------------------- */

    case "paragraph":
      return (
        <p
          key={key}
          className="mb-5 text-[1.125rem] leading-[1.75] text-gray-800"
        >
          {renderInlineContent(node.content)}
        </p>
      );

    /* --------------------------------------------------------
       HEADING
    -------------------------------------------------------- */

    case "heading": {
      const level = node.attrs?.level ?? 2;

      const content = renderInlineContent(node.content);

      if (level === 1) {
        return (
          <h1
            key={key}
            className="mb-6 mt-10 text-4xl font-bold leading-tight tracking-tight text-gray-900"
          >
            {content}
          </h1>
        );
      }

      if (level === 3) {
        return (
          <h3
            key={key}
            className="mb-4 mt-8 text-2xl font-bold leading-tight text-gray-900"
          >
            {content}
          </h3>
        );
      }

      return (
        <h2
          key={key}
          className="mb-5 mt-9 text-3xl font-bold leading-tight text-gray-900"
        >
          {content}
        </h2>
      );
    }

    /* --------------------------------------------------------
       TITLE / INTRO
       
       Kept for compatibility with your older block format.
    -------------------------------------------------------- */

    case "title":
      return (
        <h1
          key={key}
          className="mb-6 text-[2.75rem] font-bold leading-[1.15] tracking-tight text-gray-900"
        >
          {renderInlineContent(node.content)}
        </h1>
      );

    case "intro":
      return (
        <p key={key} className="mb-7 text-xl leading-relaxed text-gray-500">
          {renderInlineContent(node.content)}
        </p>
      );

    /* --------------------------------------------------------
       BULLET LIST
    -------------------------------------------------------- */

    case "bulletList":
    case "orderedList":
      return renderList(node, index);

    /* --------------------------------------------------------
       BLOCKQUOTE
    -------------------------------------------------------- */

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-7 border-l-4 border-gray-300 pl-6 text-xl italic leading-relaxed text-gray-600"
        >
          {node.content?.map((child, childIndex) => (
            <div key={childIndex}>{renderInlineContent(child.content)}</div>
          ))}
        </blockquote>
      );

    /* --------------------------------------------------------
       CODE BLOCK
    -------------------------------------------------------- */

    case "codeBlock":
    case "code":
      return (
        <pre
          key={key}
          className="my-6 overflow-x-auto rounded-xl border border-gray-700/50 bg-[#1e1e1e] px-5 py-4 font-mono text-sm leading-relaxed text-gray-100"
        >
          <code>{node.content?.map((child) => child.text ?? "").join("")}</code>
        </pre>
      );

    /* --------------------------------------------------------
       IMAGE
    -------------------------------------------------------- */

    case "image": {
      const attrs = (node.attrs ?? {}) as ImageAttrs & {
        alt?: string;
        title?: string;
      };

      if (!attrs.src) {
        return null;
      }

      return (
        <figure key={key} className="my-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attrs.src}
            alt={attrs.alt || attrs.caption || "Post image"}
            title={attrs.title}
            style={{
              width: attrs.width ? `${attrs.width}%` : "100%",
            }}
            className="mx-auto rounded-xl object-contain"
          />

          {attrs.caption && (
            <figcaption className="mt-3 text-center text-sm italic text-gray-500">
              {attrs.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    /* --------------------------------------------------------
       VIDEO
    -------------------------------------------------------- */

    case "video": {
      const attrs = (node.attrs ?? {}) as ImageAttrs;

      const src = attrs.src ?? "";

      if (!src) {
        return null;
      }

      const embedSrc = getVideoEmbedUrl(src);

      return (
        <div key={key} className="my-8 overflow-hidden rounded-xl shadow-sm">
          <iframe
            src={embedSrc}
            className="aspect-video w-full"
            allowFullScreen
            loading="lazy"
            title="Embedded video"
          />
        </div>
      );
    }

    /* --------------------------------------------------------
       HORIZONTAL RULE
    -------------------------------------------------------- */

    case "horizontalRule":
      return <hr key={key} className="my-10 border-gray-200" />;

    /* --------------------------------------------------------
       HARD BREAK
    -------------------------------------------------------- */

    case "hardBreak":
      return <br key={key} />;

    /* --------------------------------------------------------
       FALLBACK
    -------------------------------------------------------- */

    default:
      return <div key={key}>{renderInlineContent(node.content)}</div>;
  }
}

/* ============================================================
   POST VIEWER
============================================================ */

export default function PostViewer({ post }: PostViewerProps) {
  const blocks = post?.document?.blocks ?? [];

  if (!post || blocks.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500">
        <p>No content available for this post.</p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 font-sans">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="mb-14">
        {/* Author */}

        <div className="flex items-center gap-4">
          {post.author?.profileImage ? (
            <img
              src={post.author.profileImage}
              alt={post.author.username || "Author"}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-600">
              {(post.author?.username || "A").charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <div className="font-semibold text-gray-900">
              {post.author?.username || "Anonymous"}
            </div>

            <div className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Post title */}

        {post.title && (
          <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight text-gray-900">
            {post.title}
          </h1>
        )}

        {/* Likes / comments / tags */}

        <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-gray-500">
          <div>❤️ {post.likesCount ?? 0}</div>

          <div>💬 {post.commentCount ?? 0}</div>

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="post-content">
        {blocks.map((block, index) => renderBlock(block, index))}
      </div>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="mt-16 flex justify-between border-t border-gray-200 pt-8 text-sm text-gray-500">
        <div>Share this post</div>

        <div>❤️ Save for later</div>
      </footer>
    </article>
  );
}
