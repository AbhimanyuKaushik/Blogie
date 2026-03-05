"use client";
import { useEffect, useState } from "react";
import { Bookmark, Heart, MessageCircle } from "lucide-react";
import { Post, DocumentAST, InlineNode } from "../Types/PostTypes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { on } from "events";

function extractPreview(doc?: DocumentAST, max = 220) {
  if (!doc || !doc.blocks) return "";

  const getTextFromInline = (nodes?: InlineNode[]): string =>
    nodes
      ?.map((n) =>
        n.type === "text"
          ? n.value
          : "children" in n
            ? getTextFromInline(n.children)
            : "",
      )
      .join("") ?? "";

  const preferred = ["intro", "paragraph", "title"];
  for (const t of preferred) {
    const b = doc.blocks.find((blk) => blk.type === t && blk.content?.length);
    if (b) {
      const txt = getTextFromInline(b.content);
      if (txt) return txt.slice(0, max) + (txt.length > max ? "…" : "");
    }
  }

  const all = doc.blocks.map((b) => getTextFromInline(b.content)).join("\n\n");
  return all.slice(0, max) + (all.length > max ? "…" : "");
}

export default function PostCard({
  post,
  onUnsave,
}: {
  post: Post;
  onUnsave?: (postId: string) => void;
}) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLiked, setIsLiked] = useState(!!post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleLike = async () => {
    if (isLoading) return;

    const wasLiked = isLiked;
    const newLiked = !wasLiked;
    const newCount = likesCount + (wasLiked ? -1 : 1);

    // Optimistic update
    setIsLoading(true);
    setIsLiked(newLiked);
    setLikesCount(newCount);

    try {
      const res = await fetch(
        `http://localhost:5000/api/posts/${post._id}/like`,
        {
          method: wasLiked ? "DELETE" : "POST",
          credentials: "include",
        },
      );

      if (!res.ok) {
        // Revert on error
        setIsLiked(wasLiked);
        setLikesCount(likesCount);
        return; // 400 errors (already liked/not liked) are expected → silent revert
      }

      const data = await res.json();

      setLikesCount(data.likesCount);
      if (data.liked !== undefined) {
        setIsLiked(data.liked);
      }
    } catch (err) {
      setIsLiked(wasLiked);
      setLikesCount(likesCount);
      alert("Network error while updating like");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    const wasSaved = isSaved;
    const newSaved = !wasSaved;

    setIsSaving(true);
    setIsSaved(newSaved); // optimistic

    try {
      const res = await fetch(
        `http://localhost:5000/api/posts/${post._id}/save`,
        {
          method: wasSaved ? "DELETE" : "POST",
          credentials: "include",
        },
      );

      if (!res.ok) {
        setIsSaved(wasSaved); // revert
        return;
      }

      if (wasSaved && onUnsave) {
        onUnsave(post._id);
      }
    } catch (err) {
      setIsSaved(wasSaved);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article
      onClick={() => router.push(`/post/${post._id}`)}
      className="flex flex-col gap-3 py-6 border-b cursor-pointer"
    >
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs overflow-hidden">
          {post.author?.profileImage ? (
            <Image
              width={100}
              height={100}
              priority={false}
              src={post.author.profileImage}
              alt={`${post.author.username}'s profile picture`}
              className="w-6 h-6 object-cover"
            />
          ) : (
            (post.author?.username?.[0] ?? "?").toUpperCase()
          )}
        </div>
        <span className="font-medium text-black">
          {post.author?.username ?? "Unknown"}
        </span>
        <span>·</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>

      <h2 className="text-xl font-bold">{post.title}</h2>

      <p className="text-gray-600 line-clamp-2">
        {extractPreview(post.document)}
      </p>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.preventDefault(); // stops Link navigation
              e.stopPropagation(); // stops bubbling
              handleLike();
            }}
            disabled={isLoading}
            className={`flex items-center gap-1 transition-all ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:text-red-500"
            }`}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isLiked ? "fill-red-500 text-red-500" : "text-gray-500"
              }`}
            />
            {likesCount}
          </button>

          <span
            className="flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MessageCircle className="w-4 h-4" />
            {post.commentCount}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault(); // stops Link navigation
            e.stopPropagation(); // stops bubbling
            handleSave();
          }}
          disabled={isSaving}
        >
          <Bookmark
            className={`w-4 h-4 transition ${
              isSaved ? "fill-black text-black" : "text-gray-500"
            }`}
          />
        </button>
      </div>
    </article>
  );
}
