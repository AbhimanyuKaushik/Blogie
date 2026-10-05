"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PostCard from "./Components/PostCard";
import type { Post } from "./Types/PostTypes";
import { useAuth } from "./Context/AuthContext";
import Image from "next/image";
import {
  Search,
  UserRound,
  FileText,
  X,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

const LIMIT = 10;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

/* ============================================================
   SEARCH TYPES
============================================================ */

type SearchUser = {
  _id: string;
  username: string;
  profileImage?: string | null;
};

type SearchPost = {
  _id: string;
  title: string;
  content?: string;
  author?: {
    _id: string;
    username: string;
    profileImage?: string | null;
  };
};

type SearchResults = {
  users: SearchUser[];
  posts: SearchPost[];
};

/* ============================================================
   HOME
============================================================ */

export default function Home() {
  const { user } = useAuth();

  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  /* ==========================================================
     FEED
  ========================================================== */

  const skipRef = useRef(skip);

  useEffect(() => {
    skipRef.current = skip;
  }, [skip]);

  const fetchFeed = useCallback(async (reset = false) => {
    try {
      setLoading(true);

      const fetchSkip = reset ? 0 : skipRef.current;

      const res = await fetch(
        `${API_BASE_URL}/feed?limit=${LIMIT}&skip=${fetchSkip}`,
        {
          credentials: "include",
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch feed");
      }

      const data = await res.json();

      setPosts((prev) => (reset ? data.posts : [...prev, ...data.posts]));

      setHasMore(data.hasMore);

      const newSkip = fetchSkip + data.posts.length;

      setSkip(newSkip);
    } catch (err) {
      console.error("Feed error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setPosts([]);
    setSkip(0);
    setHasMore(true);

    fetchFeed(true);
  }, [fetchFeed, user]);

  /* ==========================================================
     LOGGED OUT HOME
  ========================================================== */

  if (!user) {
    return <HomePage />;
  }

  /* ==========================================================
     LOGGED IN HOME
  ========================================================== */

  return (
    <div className="min-h-screen font-sans bg-white">
      {/* ======================================================
          SEARCH
      ====================================================== */}

      <SearchBar />

      {/* ======================================================
          FEED
      ====================================================== */}

      <div className="flex justify-center">
        <section className="w-full max-w-2xl px-4">
          {loading && posts.length === 0 ? (
            <div className="text-center mt-24 text-gray-500">Loading...</div>
          ) : posts.length === 0 ? (
            <EmptyFeed />
          ) : (
            <>
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}

              {/* LOAD MORE */}

              {hasMore && !loading && (
                <div className="flex justify-center my-8">
                  <button
                    type="button"
                    onClick={() => fetchFeed(false)}
                    className="
                      border
                      border-black
                      px-5
                      py-2.5
                      text-xs
                      tracking-wide
                      hover:bg-black
                      hover:text-white
                      transition
                    "
                  >
                    Load more
                  </button>
                </div>
              )}

              {loading && posts.length > 0 && (
                <div className="text-center my-8 text-gray-500">
                  Loading more...
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ============================================================
   SEARCH BAR
============================================================ */

function SearchBar() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    users: [],
    posts: [],
  });

  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  /* ==========================================================
     SEARCH REQUEST
  ========================================================== */

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setResults({
        users: [],
        posts: [],
      });

      setSearching(false);

      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        setShowResults(true);

        /*
         * Search users and posts at the same time.
         */

        const [usersResponse, postsResponse] = await Promise.all([
          fetch(
            `${API_BASE_URL}/users/search?query=${encodeURIComponent(
              trimmedQuery,
            )}&limit=5`,
            {
              credentials: "include",
              signal: controller.signal,
            },
          ),

          fetch(
            `${API_BASE_URL}/posts/search?query=${encodeURIComponent(
              trimmedQuery,
            )}&limit=5`,
            {
              credentials: "include",
              signal: controller.signal,
            },
          ),
        ]);

        const usersData = usersResponse.ok
          ? await usersResponse.json()
          : { users: [] };

        const postsData = postsResponse.ok
          ? await postsResponse.json()
          : { posts: [] };

        setResults({
          users: Array.isArray(usersData?.users) ? usersData.users : [],

          posts: Array.isArray(postsData?.posts) ? postsData.posts : [],
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Search error:", error);

        setResults({
          users: [],
          posts: [],
        });
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  /* ==========================================================
     CLOSE WHEN CLICKING OUTSIDE
  ========================================================== */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ==========================================================
     KEYBOARD
  ========================================================== */

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setShowResults(false);
      return;
    }

    if (event.key === "Enter" && query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);

      setShowResults(false);
    }
  };

  const hasResults = results.users.length > 0 || results.posts.length > 0;

  return (
    <div
      ref={searchRef}
      className="
        max-w-2xl
        mx-auto
        px-4
        pt-8
        pb-6
        relative
      "
    >
      {/* ======================================================
          INPUT
      ====================================================== */}

      <div
        className={`
          relative
          flex
          items-center
          border
          bg-white
          transition-all
          ${
            showResults
              ? "border-black"
              : "border-gray-300 hover:border-gray-500"
          }
        `}
      >
        <Search size={18} className="ml-4 text-gray-400 shrink-0" />

        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowResults(event.target.value.trim().length >= 2);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setShowResults(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search people, posts, topics..."
          className="
            w-full
            px-4
            py-3.5
            text-sm
            outline-none
            bg-transparent
            placeholder:text-gray-400
          "
        />

        {searching && (
          <Loader2 size={17} className="mr-4 animate-spin text-gray-400" />
        )}

        {!searching && query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setShowResults(false);
            }}
            className="mr-3 p-1 text-gray-400 hover:text-black"
            aria-label="Clear search"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* ======================================================
          SEARCH DROPDOWN
      ====================================================== */}

      {showResults && query.trim().length >= 2 && (
        <div
          className="
            absolute
            left-4
            right-4
            top-[calc(100%-24px)]
            bg-white
            border
            border-black
            shadow-xl
            z-50
            overflow-hidden
          "
        >
          {searching ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              Searching...
            </div>
          ) : !hasResults ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-700">No results found</p>

              <p className="text-xs text-gray-400 mt-1">
                Try another person, post or topic.
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {/* =================================================
                  PEOPLE
              ================================================= */}

              {results.users.length > 0 && (
                <div>
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                    <UserRound size={14} className="text-gray-400" />

                    <span className="text-[10px] tracking-[0.2em] text-gray-400 font-semibold">
                      PEOPLE
                    </span>
                  </div>

                  {results.users.map((searchUser) => (
                    <button
                      key={searchUser._id}
                      type="button"
                      onClick={() => {
                        router.push(`/publicProfile/${searchUser._id}`);

                        setShowResults(false);
                      }}
                      className="
                        w-full
                        flex
                        items-center
                        gap-3
                        px-5
                        py-3
                        text-left
                        hover:bg-gray-50
                        transition
                      "
                    >
                      {/* Avatar */}

                      {searchUser.profileImage ? (
                        <img
                          src={searchUser.profileImage}
                          alt={searchUser.username}
                          className="
                            w-9
                            h-9
                            rounded-full
                            object-cover
                          "
                        />
                      ) : (
                        <div
                          className="
                            w-9
                            h-9
                            rounded-full
                            bg-black
                            text-white
                            flex
                            items-center
                            justify-center
                            text-xs
                            font-medium
                          "
                        >
                          {getInitials(searchUser.username)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {searchUser.username}
                        </p>

                        <p className="text-xs text-gray-400">User</p>
                      </div>

                      <ArrowUpRight size={15} className="text-gray-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* =================================================
                  POSTS
              ================================================= */}

              {results.posts.length > 0 && (
                <div className="border-t border-gray-200">
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" />

                    <span className="text-[10px] tracking-[0.2em] text-gray-400 font-semibold">
                      POSTS
                    </span>
                  </div>

                  {results.posts.map((post) => (
                    <button
                      key={post._id}
                      type="button"
                      onClick={() => {
                        router.push(`/post/${post._id}`);

                        setShowResults(false);
                      }}
                      className="
                        w-full
                        text-left
                        px-5
                        py-3
                        hover:bg-gray-50
                        transition
                        flex
                        items-start
                        gap-3
                      "
                    >
                      <div
                        className="
                          w-9
                          h-9
                          shrink-0
                          border
                          border-gray-200
                          flex
                          items-center
                          justify-center
                        "
                      >
                        <FileText size={15} className="text-gray-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {post.title || "Untitled post"}
                        </p>

                        {post.author?.username && (
                          <p className="text-xs text-gray-400 mt-1">
                            by {post.author.username}
                          </p>
                        )}
                      </div>

                      <ArrowUpRight size={15} className="text-gray-300 mt-1" />
                    </button>
                  ))}
                </div>
              )}

              {/* =================================================
                  VIEW ALL
              ================================================= */}

              <button
                type="button"
                onClick={() => {
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);

                  setShowResults(false);
                }}
                className="
                  w-full
                  border-t
                  border-gray-200
                  px-5
                  py-3
                  text-xs
                  font-medium
                  tracking-wide
                  text-center
                  hover:bg-black
                  hover:text-white
                  transition
                "
              >
                View all results →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   HOME PAGE — LOGGED OUT
============================================================ */

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

/* ============================================================
   EMPTY FEED
============================================================ */

function EmptyFeed() {
  return (
    <div className="text-center mt-24 text-gray-500">
      <h2 className="text-xl font-medium mb-2">Your feed is empty</h2>

      <p>Follow writers or start writing.</p>
    </div>
  );
}

/* ============================================================
   INITIALS
============================================================ */

function getInitials(name: string) {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
