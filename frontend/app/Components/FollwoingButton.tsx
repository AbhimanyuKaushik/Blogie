"use client";

import { useState } from "react";
import { useAuth } from "../Context/AuthContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

type FollowButtonProps = {
  targetUserId: string;
  initialFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
};

export default function FollowButton({
  targetUserId,
  initialFollowing = false,
  onFollowChange,
}: FollowButtonProps) {
  const { user } = useAuth();

  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Don't show follow button for yourself
  if (!user || user.id === targetUserId) {
    return null;
  }

  const handleFollowToggle = async () => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const method = isFollowing ? "DELETE" : "POST";

      const response = await fetch(
        `${API_BASE_URL}/users/${targetUserId}/follow`,
        {
          method,
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Failed to ${isFollowing ? "unfollow" : "follow"} user`,
        );
      }

      const newFollowingState = !isFollowing;

      setIsFollowing(newFollowingState);
      onFollowChange?.(newFollowingState);
    } catch (error) {
      console.error("Follow/unfollow error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleFollowToggle}
        disabled={loading}
        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
          isFollowing
            ? "border border-gray-300 bg-white text-gray-800 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            : "bg-black text-white hover:bg-gray-800"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {loading ? "..." : isFollowing ? "Following" : "Follow"}
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
