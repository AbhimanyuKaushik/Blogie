"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../Context/AuthContext";
import { User as UserType } from "../Types/UserTypes";

const API_BASE_URL = "http://localhost:8080/api";

type CommentUser = {
  _id: string;
  username: string;
  profileImage?: string;
};

type Comment = {
  _id: string;
  postId: string;
  userId: CommentUser | null;
  content: string;
  likesCount: number;
  likedByMe?: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type CommentWithReplies = Comment & {
  replies: CommentWithReplies[];
};

type CommentsProps = {
  postId: string;
  postAuthorId: string;
};

export default function Comments({ postId, postAuthorId }: CommentsProps) {
  const { user } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [error, setError] = useState("");

  /*
   * ==========================================================
   * CURRENT USER ID
   * ==========================================================
   */

  const currentUserId =
    user?.id?.toString() ||
    (user as UserType & { _id?: string })?._id?.toString();

  /*
   * ==========================================================
   * FETCH COMMENTS
   * ==========================================================
   */

  const fetchComments = async () => {
    if (!postId) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch comments.");
      }

      setComments(data.comments || []);
    } catch (error) {
      console.error("FETCH COMMENTS ERROR:", error);

      setError(
        error instanceof Error ? error.message : "Unable to load comments.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!postId) return;

    fetchComments();
  }, [postId]);

  /*
   * ==========================================================
   * ADD TOP-LEVEL COMMENT
   * ==========================================================
   */

  const handleSubmitComment = async () => {
    const content = commentText.trim();

    if (!content || submitting) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add comment.");
      }

      if (data.comment) {
        setComments((prev) => [data.comment, ...prev]);
      } else {
        await fetchComments();
      }

      setCommentText("");
    } catch (error) {
      console.error("ADD COMMENT ERROR:", error);

      setError(
        error instanceof Error ? error.message : "Unable to add comment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ==========================================================
   * ADD REPLY
   * ==========================================================
   */

  const handleSubmitReply = async (parentId: string) => {
    const content = replyText.trim();

    if (!content || submitting) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          content,
          parentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add reply.");
      }

      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
      } else {
        await fetchComments();
      }

      setReplyText("");
      setReplyingTo(null);
    } catch (error) {
      console.error("ADD REPLY ERROR:", error);

      setError(error instanceof Error ? error.message : "Unable to add reply.");
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ==========================================================
   * LIKE / UNLIKE COMMENT
   * ==========================================================
   */

  const handleLikeComment = async (commentId: string) => {
    if (likingId) return;

    const comment = comments.find((item) => item._id === commentId);

    if (!comment) return;

    const likedByMe = Boolean(comment.likedByMe);

    try {
      setLikingId(commentId);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/posts/${postId}/comments/${commentId}/like`,
        {
          method: likedByMe ? "DELETE" : "POST",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update comment like.");
      }

      setComments((prev) =>
        prev.map((item) => {
          if (item._id !== commentId) {
            return item;
          }

          return {
            ...item,
            likedByMe: data.likedByMe ?? !likedByMe,
            likesCount:
              data.likesCount ??
              (likedByMe
                ? Math.max(0, item.likesCount - 1)
                : item.likesCount + 1),
          };
        }),
      );
    } catch (error) {
      console.error("COMMENT LIKE ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update comment like.",
      );
    } finally {
      setLikingId(null);
    }
  };

  /*
   * ==========================================================
   * DELETE PERMISSION
   * ==========================================================
   */

  const canDeleteComment = (comment: Comment) => {
    if (!currentUserId) {
      return false;
    }

    const commentAuthorId = comment.userId?._id?.toString();

    const currentPostAuthorId = postAuthorId?.toString();

    return (
      currentUserId === commentAuthorId || currentUserId === currentPostAuthorId
    );
  };

  /*
   * ==========================================================
   * DELETE COMMENT
   * ==========================================================
   */

  const handleDeleteComment = async (commentId: string) => {
    if (deletingId) return;

    try {
      setDeletingId(commentId);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/posts/${postId}/comments/${commentId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete comment.");
      }

      /*
       * Remove the comment and all descendants
       * from the local comment state.
       */
      setComments((prev) => removeCommentAndReplies(prev, commentId));
    } catch (error) {
      console.error("DELETE COMMENT ERROR:", error);

      setError(
        error instanceof Error ? error.message : "Unable to delete comment.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * ==========================================================
   * BUILD COMMENT TREE
   * ==========================================================
   */

  const commentTree = useMemo(() => {
    const commentMap = new Map<string, CommentWithReplies>();

    /*
     * First create a node for every comment.
     */
    comments.forEach((comment) => {
      commentMap.set(comment._id, {
        ...comment,
        replies: [],
      });
    });

    const roots: CommentWithReplies[] = [];

    /*
     * Then connect each comment to its parent.
     */
    comments.forEach((comment) => {
      const current = commentMap.get(comment._id);

      if (!current) return;

      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);

        if (parent) {
          parent.replies.push(current);
        } else {
          /*
           * Safety fallback:
           * if the parent isn't available,
           * don't hide the comment.
           */
          roots.push(current);
        }
      } else {
        roots.push(current);
      }
    });

    return roots;
  }, [comments]);

  /*
   * ==========================================================
   * RECURSIVE COMMENT RENDERER
   * ==========================================================
   */

  const renderComment = (comment: CommentWithReplies): ReactNode => {
    const isReplying = replyingTo === comment._id;

    const isLiking = likingId === comment._id;

    return (
      <article key={comment._id} className="flex gap-4">
        {/* ==================================================
            AVATAR
        ================================================== */}

        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
          {comment.userId?.profileImage ? (
            <img
              src={comment.userId.profileImage}
              alt={comment.userId.username || "User"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserIcon size={18} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* ==================================================
            COMMENT BODY
        ================================================== */}

        <div className="min-w-0 flex-1">
          {/* COMMENT CARD */}

          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            {/* USERNAME + DELETE */}

            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">
                {comment.userId?.username || "Anonymous"}
              </span>

              {canDeleteComment(comment) && (
                <button
                  type="button"
                  onClick={() => handleDeleteComment(comment._id)}
                  disabled={deletingId === comment._id}
                  className="text-gray-400 transition hover:text-red-500 disabled:opacity-50"
                  aria-label="Delete comment"
                  title="Delete comment"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {/* CONTENT */}

            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {comment.content}
            </p>
          </div>

          {/* ==================================================
              DATE + LIKE + REPLY
          ================================================== */}

          <div className="mt-2 flex items-center gap-4 px-2">
            {/* DATE */}

            <span className="text-xs text-gray-400">
              {new Date(comment.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>

            {/* LIKE */}

            <button
              type="button"
              onClick={() => handleLikeComment(comment._id)}
              disabled={isLiking}
              className={`inline-flex items-center gap-1.5 text-xs font-medium transition ${
                comment.likedByMe
                  ? "text-red-500"
                  : "text-gray-500 hover:text-red-500"
              } disabled:opacity-50`}
              aria-label={comment.likedByMe ? "Unlike comment" : "Like comment"}
              title={comment.likedByMe ? "Unlike" : "Like"}
            >
              <Heart
                size={15}
                fill={comment.likedByMe ? "currentColor" : "none"}
              />

              <span>{comment.likesCount}</span>
            </button>

            {/* REPLY */}

            <button
              type="button"
              onClick={() => {
                if (isReplying) {
                  setReplyingTo(null);
                  setReplyText("");
                } else {
                  setReplyingTo(comment._id);
                  setReplyText("");
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600"
            >
              <MessageCircle size={15} />
              Reply
            </button>
          </div>

          {/* ==================================================
              REPLY INPUT
          ================================================== */}

          {isReplying && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
              <textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={`Reply to ${
                  comment.userId?.username || "this comment"
                }...`}
                maxLength={1000}
                rows={3}
                disabled={submitting}
                autoFocus
                className="w-full resize-none bg-transparent text-sm leading-6 text-gray-800 outline-none placeholder:text-gray-400"
              />

              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-xs text-gray-400">
                  {replyText.length}/1000
                </span>

                <div className="flex items-center gap-2">
                  {/* CANCEL */}

                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                    disabled={submitting}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  {/* SUBMIT REPLY */}

                  <button
                    type="button"
                    onClick={() => handleSubmitReply(comment._id)}
                    disabled={!replyText.trim() || submitting}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    <Send size={13} />

                    {submitting ? "Replying..." : "Reply"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              NESTED REPLIES
          ================================================== */}

          {comment.replies.length > 0 && (
            <div className="mt-5 space-y-5 border-l-2 border-gray-100 pl-5">
              {comment.replies.map((reply) => renderComment(reply))}
            </div>
          )}
        </div>
      </article>
    );
  };

  /*
   * ==========================================================
   * TOP-LEVEL COMMENT COUNT
   * ==========================================================
   */

  const topLevelCommentCount = comments.filter(
    (comment) => !comment.parentId,
  ).length;

  /*
   * ==========================================================
   * UI
   * ==========================================================
   */

  return (
    <section className="mt-16 border-t border-gray-200 pt-10">
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="mb-7 flex items-center gap-2">
        <MessageCircle size={22} className="text-gray-700" />

        <h2 className="text-2xl font-bold text-gray-900">Comments</h2>

        {/* ONLY TOP-LEVEL COMMENTS */}

        <span className="text-sm text-gray-400">({topLevelCommentCount})</span>
      </div>

      {/* ==================================================
          NEW COMMENT INPUT
      ================================================== */}

      <div className="mb-10">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Write a comment..."
            maxLength={1000}
            rows={4}
            disabled={submitting}
            className="w-full resize-none bg-transparent text-sm leading-6 text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-xs text-gray-400">
              {commentText.length}/1000
            </span>

            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Send size={15} />

              {submitting ? "Posting..." : "Comment"}
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ==================================================
          LOADING
      ================================================== */}

      {loading && (
        <div className="py-8 text-center text-sm text-gray-400">
          Loading comments...
        </div>
      )}

      {/* ==================================================
          EMPTY STATE
      ================================================== */}

      {!loading && comments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <MessageCircle size={34} className="mx-auto mb-3 text-gray-300" />

          <p className="font-medium text-gray-600">No comments yet</p>

          <p className="mt-1 text-sm text-gray-400">
            Be the first to start the conversation.
          </p>
        </div>
      )}

      {/* ==================================================
          COMMENT TREE
      ================================================== */}

      {!loading && commentTree.length > 0 && (
        <div className="space-y-6">
          {commentTree.map((comment) => renderComment(comment))}
        </div>
      )}
    </section>
  );
}

/*
 * ============================================================
 * REMOVE COMMENT + ALL DESCENDANTS
 * ============================================================
 *
 * Example:
 *
 * Comment A
 *   ├── Reply B
 *   │    └── Reply C
 *   └── Reply D
 *
 * Delete A
 *   ↓
 * A, B, C and D are removed locally.
 */

function removeCommentAndReplies(
  comments: Comment[],
  commentId: string,
): Comment[] {
  const idsToRemove = new Set<string>([commentId]);

  let changed = true;

  while (changed) {
    changed = false;

    for (const comment of comments) {
      if (
        comment.parentId &&
        idsToRemove.has(comment.parentId) &&
        !idsToRemove.has(comment._id)
      ) {
        idsToRemove.add(comment._id);
        changed = true;
      }
    }
  }

  return comments.filter((comment) => !idsToRemove.has(comment._id));
}
