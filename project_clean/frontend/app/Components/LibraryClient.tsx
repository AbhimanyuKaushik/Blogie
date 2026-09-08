"use client";

import { useState } from "react";
import PostCard from "@/app/Components/PostCard";
import { Post } from "../Types/PostTypes";

export default function LibraryClient({
  initialPosts,
}: {
  initialPosts: Post[];
}) {
  const [savedPosts, setSavedPosts] = useState<Post[]>(initialPosts);

  const handleUnsave = (postId: string) => {
    setSavedPosts((prev) =>
      prev.filter((p) => p._id !== postId)
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-10">Your Library</h1>

      {savedPosts.length === 0 ? (
        <p className="text-gray-500">
          You haven’t saved any posts yet.
        </p>
      ) : (
        savedPosts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onUnsave={handleUnsave}
          />
        ))
      )}
    </div>
  );
}