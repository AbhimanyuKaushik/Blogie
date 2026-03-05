"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import PostCard from "./Components/PostCard";
import type { Post } from "./Types/PostTypes";
import { useAuth } from "./Context/AuthContext";
import Image from "next/image";

const LIMIT = 10;

export default function Home() {
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Use a ref to track the latest skip value for the fetch function
  // This prevents stale closures and allows us to remove fetchFeed from useEffect deps
  const skipRef = useRef(skip);
  useEffect(() => {
    skipRef.current = skip;
  }, [skip]);

  const fetchFeed = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);

        // Use the ref for the latest skip value (or 0 for reset)
        const fetchSkip = reset ? 0 : skipRef.current;

        const res = await fetch(
          `http://localhost:5000/api/feed?limit=${LIMIT}&skip=${fetchSkip}`,
          { credentials: "include" },
        );

        if (!res.ok) throw new Error("Failed to fetch feed");

        const data = await res.json();

        // Append or reset posts
        setPosts((prev) => (reset ? data.posts : [...prev, ...data.posts]));

        setHasMore(data.hasMore);

        // Update skip based on ACTUAL number of posts returned (more robust)
        // This handles cases where the last page has fewer than LIMIT posts
        const newSkip = fetchSkip + data.posts.length;
        setSkip(newSkip);
      } catch (err) {
        console.error("Feed error:", err);
      } finally {
        setLoading(false);
      }
    },
    [], // No dependencies! We use the ref for skip
  );

  // Initial fetch ONLY when user changes (no more refetch on skip changes)
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Reset state for a fresh feed when user logs in
    setPosts([]);
    setSkip(0);
    setHasMore(true);

    fetchFeed(true);
  }, [fetchFeed, user]);

  if (!user) {
    return <HomePage />;
  }

  return (
    <div className="flex min-h-screen justify-center font-sans">
      <section className="w-full max-w-2xl px-4">
        {loading && posts.length === 0 ? (
          <div className="text-center mt-24 text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <EmptyFeed />
        ) : (
          <>
            {posts.map((post) => (
              // Use post._id as key (much better than index, especially with pagination)
              <PostCard key={post._id} post={post} />
            ))}

            {hasMore && !loading && (
              <div className="flex justify-center my-8">
                <button
                  onClick={() => fetchFeed(false)}
                  className="border px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Load more
                </button>
              </div>
            )}

            {loading && posts.length > 0 && (
              <div className="text-center my-8 text-gray-500">Loading more...</div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function HomePage() {
  return (
    <div className="grid grid-cols-2 h-full text-black font-sans">
      <div className="flex flex-col justify-center px-24 gap-12">
        <h1 className="text-[64px] leading-[1.1] font-medium">
          Blogs that <br />
          can be <br />
          interesting.
        </h1>

        <div className="flex flex-col gap-3 max-w-md">
          <div className="flex items-center justify-between text-xs tracking-widest">
            <span>CONTENT DISTRIBUTION</span>
            <button className="border px-3 py-1 text-[10px]">READ MORE</button>
          </div>
          <p className="text-sm text-gray-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <div className="h-px bg-black/30 mt-2" />
        </div>

        <div className="flex flex-col gap-3 max-w-md">
          <div className="flex items-center justify-between text-xs tracking-widest">
            <span>DIGITAL ERA</span>
            <button className="border px-3 py-1 text-[10px]">READ MORE</button>
          </div>
          <p className="text-sm text-gray-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="relative w-105 h-130 bg-gray-300 overflow-hidden">
          <Image
            width={400}
            height={400}
            src="/hand.webp"
            alt="Abstract hand"
            className="w-full h-full object-cover grayscale"
          />
        </div>
      </div>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="text-center mt-24 text-gray-500">
      <h2 className="text-xl font-medium mb-2">Your feed is empty</h2>
      <p>Follow writers or start writing.</p>
    </div>
  );
}