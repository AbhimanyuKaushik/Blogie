"use client";

import React, { useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

type CollaborateModalProps = {
  postId: string;
  onClose: () => void;
  onInvited?: () => void;
};

export default function CollaborateModal({
  postId,
  onClose,
  onInvited,
}: CollaborateModalProps) {
  const [username, setUsername] = useState("");

  const [role, setRole] = useState<"editor" | "commenter">("editor");

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const handleInvite = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError("Enter a username.");
      return;
    }

    if (!postId) {
      setError("Post ID is missing.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const url = `${API_BASE_URL}/posts/${postId}/collaborators`;

      console.log("[COLLABORATION INVITE] Sending request to:", url);

      const response = await fetch(url, {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          username: trimmedUsername,
          role,
        }),
      });

      const rawText = await response.text();

      console.log("[COLLABORATION INVITE] Response status:", response.status);

      console.log("[COLLABORATION INVITE] Raw response:", rawText);

      let data: any = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {
          message: rawText,
        };
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Failed to send invitation (${response.status})`,
        );
      }

      console.log("[COLLABORATION INVITE] Invitation successful:", data);

      setSuccess(`Invitation sent to @${trimmedUsername}.`);

      setUsername("");

      onInvited?.();
    } catch (error) {
      console.error("[COLLABORATION INVITE ERROR]", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to send collaboration invitation.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Collaborate</h2>

            <p className="mt-1 text-sm text-gray-500">
              Invite someone to work on this post.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-black disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Username */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
                setSuccess("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !sending) {
                  event.preventDefault();
                  handleInvite();
                }
              }}
              placeholder="Enter username"
              disabled={sending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-100"
              autoFocus
            />
          </div>

          {/* Role */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Permission
            </label>

            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as "editor" | "commenter");
              }}
              disabled={sending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-100"
            >
              <option value="editor">Editor — can edit</option>

              <option value="commenter">Commenter — view/comment</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700">
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleInvite}
            disabled={sending || !username.trim()}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
