"use client";

import dynamic from "next/dynamic";

import {
  useEffect,
  useState,
} from "react";

const NewPostEditor = dynamic(
  () =>
    import(
      "../Components/NewPostEditor"
    ),
  {
    ssr: false,
  },
);

export default function NewPostPage() {
  const [postId, setPostId] =
    useState<string | null>(
      null,
    );
  const [currentUserId, setCurrentUserId] =
    useState<string>(
      "",
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const createDraft =
      async () => {
        try {
          const res =
            await fetch(
              "http://localhost:5000/api/posts/draft",
              {
                method: "POST",

                credentials:
                  "include",

                headers: {
                  "Content-Type":
                    "application/json",
                },
              },
            );

          if (!res.ok) {
            throw new Error(
              "Failed to create draft",
            );
          }

          const data =
            await res.json();

          setPostId(
            data.post._id,
          );
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

    createDraft();
  }, []);

  if (loading) {
    return (
      <div className="p-10">
        Creating draft...
      </div>
    );
  }

  if (!postId) {
    return (
      <div className="p-10 text-red-500">
        Failed to create draft
      </div>
    );
  }

  return (
    <NewPostEditor
      postId={postId}
      currentUserId={currentUserId}
    />
  );
}