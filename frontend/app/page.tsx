"use client";

import { useEffect, useState } from "react";
import PostCard from "./Components/PostCard";
import type { Post } from "./Types/PostTypes";
import { useAuth } from "./Context/AuthContext";
import Image from "next/image";

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const getFeed = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/posts", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data = await res.json();
        setPosts(data);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    getFeed();
  }, [user]);

  if (!user) {
    return <HomePage />;
  }

  const filteredPosts = posts.filter((post: Post) =>
    post.tags.some((tag) => user.interests?.includes(tag)),
  );
  return (
    <div className="flex min-h-screen justify-center font-sans">
      <section>
        {loading ? (
          <div className="text-center mt-24 text-gray-500">Loading...</div>
        ) : filteredPosts.length === 0 ? (
          <EmptyFeed />
        ) : (
          filteredPosts.map((post: Post) => (
            <PostCard key={post._id} post={post} />
          ))
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
