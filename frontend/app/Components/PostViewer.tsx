"use client"; // Keep this—it's interactive (images, embeds)

import { Post, BlockNode, ImageAttrs } from "../Types/PostTypes"; // Your types are here ✅
import { getVideoEmbedUrl } from "./NewPostEditor"; // Reuse your helper! (it's in the same folder)

interface PostViewerProps {
  post: Post;
}

export default function PostViewer({ post }: PostViewerProps) {
  if (!post || !post.document?.blocks?.length) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>No content available for this post.</p>
      </div>
    );
  }
  const renderBlock = (block: BlockNode, index: number) => {
    const contentHtml =
      block.content?.[0]?.type === "text" ? block.content[0].value : "";

    switch (block.type) {
      case "title":
        return (
          <h1
            key={block.id ?? `title-${index}`} 
            className="text-[2.75rem] font-bold leading-[1.15] tracking-tight text-gray-900 mb-4"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        );

      case "intro":
        return (
          <p
            key={block.id ?? `intro-${index}`}
            className="text-xl text-gray-500 leading-relaxed mb-6"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        );

      case "paragraph":
        return (
          <p
            key={block.id ?? `paragraph-${index}`}
            className="text-[1.125rem] text-gray-800 leading-[1.6] mb-5"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        );

      case "heading":
        return (
          <h2
            key={block.id ?? `heading-${index}`}
            className="text-xl font-bold text-gray-900 leading-snug mb-4"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        );

      case "code":
        return (
          <pre
            key={block.id ?? `code-${index}`}
            className="font-mono text-sm text-gray-200 bg-[#1e1e1e] rounded-md px-4 py-3 mb-5 overflow-x-auto border border-gray-700/50"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        );

      case "image":
        const imageAttrs = block.attrs as ImageAttrs;
        return (
          <figure key={block.id ?? `image-${index}`} className="my-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageAttrs.src}
              style={{ width: `${imageAttrs.width ?? 100}%` }}
              className="rounded mx-auto"
              alt={imageAttrs.caption || "Post image"}
            />
            {imageAttrs.caption && (
              <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
                {imageAttrs.caption}
              </figcaption>
            )}
          </figure>
        );

      case "video":
        const videoAttrs = block.attrs as ImageAttrs;
        const embedSrc = getVideoEmbedUrl(videoAttrs.src ?? "");
        return (
          <div key={block.id ?? `video-${index}`} className="my-6">
            <iframe
              src={embedSrc}
              className="w-full aspect-video rounded mx-auto shadow-sm"
              allowFullScreen
              title="Embedded video"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <article className="max-w-2xl mx-auto px-6 py-12 font-sans">
      {/* Header */}
      <header className="mb-12">
        <div className="flex items-center gap-4">
          {post.author?.profileImage && (
            <img
              src={post.author.profileImage}
              alt={post.author.username}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white"
            />
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

        {/* Likes, Comments, Tags */}
        <div className="flex items-center gap-6 mt-6 text-sm text-gray-500">
          <div>❤️ {post.likesCount}</div>
          <div>💬 {post.commentCount}</div>
          {post.tags.length > 0 && (
            <div className="flex gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content Blocks (exact match to editor) */}
      <div className="space-y-10">
        {post.document.blocks.map((block, index) => renderBlock(block, index))}
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-gray-200 flex justify-between text-sm text-gray-500">
        <div>Share this post</div>
        <div>❤️ Save for later</div>
      </footer>
    </article>
  );
}
