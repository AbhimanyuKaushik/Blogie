"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Heart,
  MessageCircle,
  FileText,
  Users,
  TrendingUp,
  BarChart3,
  ArrowUpDown,
  CalendarDays,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api";

interface Stats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalReach: number;

  averageViews: number;
  averageLikes: number;
  averageComments: number;

  engagementRate?: number;
}

interface Post {
  _id: string;
  title: string;
  views: number;
  likesCount: number;
  commentCount: number;
  createdAt: string;
}

type SortField = "title" | "views" | "likes" | "comments" | "date";

type SortDirection = "asc" | "desc";

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [sortField, setSortField] = useState<SortField>("date");

  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  /*
   * ==========================================================
   * FETCH CREATOR ANALYTICS
   * ==========================================================
   */

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/stats/creator`, {
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch analytics.");
        }

        setStats(data.summary);
        setPosts(data.posts || []);
      } catch (error) {
        console.error("STATS FETCH ERROR:", error);

        setError(
          error instanceof Error ? error.message : "Unable to load analytics.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  /*
   * ==========================================================
   * SORT POSTS
   * ==========================================================
   */

  const sortedPosts = useMemo(() => {
    const result = [...posts];

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;

        case "views":
          comparison = a.views - b.views;
          break;

        case "likes":
          comparison = a.likesCount - b.likesCount;
          break;

        case "comments":
          comparison = a.commentCount - b.commentCount;
          break;

        case "date":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [posts, sortField, sortDirection]);

  /*
   * ==========================================================
   * TOP POSTS
   * ==========================================================
   */

  const topPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.views - a.views).slice(0, 3);
  }, [posts]);

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <div className="h-9 w-48 animate-pulse rounded bg-gray-200" />

            <div className="mt-3 h-5 w-72 animate-pulse rounded bg-gray-200" />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({
              length: 5,
            }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl bg-white shadow-sm"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-700">
            Unable to load analytics
          </h2>

          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  /*
   * ==========================================================
   * MAIN UI
   * ==========================================================
   */

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10 text-gray-900 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
              <BarChart3 size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>

              <p className="mt-1 text-sm text-gray-500">
                Performance of your published posts
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================
            KPI CARDS
        ================================================== */}

        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Published Posts"
            value={formatNumber(stats.totalPosts)}
            icon={<FileText size={20} />}
          />

          <StatCard
            title="Total Views"
            value={formatNumber(stats.totalViews)}
            icon={<Eye size={20} />}
          />

          <StatCard
            title="Total Likes"
            value={formatNumber(stats.totalLikes)}
            icon={<Heart size={20} />}
          />

          <StatCard
            title="Total Comments"
            value={formatNumber(stats.totalComments)}
            icon={<MessageCircle size={20} />}
          />

          <StatCard
            title="Reach"
            value={formatNumber(stats.totalReach)}
            icon={<Users size={20} />}
          />
        </div>

        {/* ==================================================
            SECONDARY METRICS
        ================================================== */}

        <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <MetricCard
            title="Average Views / Post"
            value={formatDecimal(stats.averageViews)}
            description="Average number of views per published post"
          />

          <MetricCard
            title="Average Likes / Post"
            value={formatDecimal(stats.averageLikes)}
            description="Average number of likes per published post"
          />

          <MetricCard
            title="Average Comments / Post"
            value={formatDecimal(stats.averageComments)}
            description="Average number of comments per published post"
          />
        </div>

        {/* ==================================================
            ENGAGEMENT
        ================================================== */}

        <div className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-100 p-3 text-green-600">
                <TrendingUp size={24} />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">Engagement Rate</h2>

                <p className="mt-1 text-sm text-gray-500">
                  Likes and comments relative to total views
                </p>
              </div>
            </div>

            <div className="text-3xl font-bold text-green-600">
              {(stats.engagementRate ?? 0).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* ==================================================
            TOP POSTS
        ================================================== */}

        <div className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Top Performing Posts</h2>

              <p className="mt-1 text-sm text-gray-500">
                Your posts ranked by total views
              </p>
            </div>
          </div>

          {topPosts.length === 0 ? (
            <EmptyPosts />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {topPosts.map((post, index) => (
                <TopPostCard key={post._id} post={post} rank={index + 1} />
              ))}
            </div>
          )}
        </div>

        {/* ==================================================
            POST PERFORMANCE TABLE
        ================================================== */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-gray-200 p-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold">Post Performance</h2>

              <p className="mt-1 text-sm text-gray-500">
                Detailed performance of every published post
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ArrowUpDown size={15} />
              Sorted by{" "}
              <span className="font-medium text-gray-900">
                {getSortLabel(sortField)}
              </span>
            </div>
          </div>

          {posts.length === 0 ? (
            <EmptyPosts />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <SortableHeader
                      label="Post"
                      field="title"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort(
                        "title",
                        sortField,
                        sortDirection,
                        setSortField,
                        setSortDirection,
                      )}
                    />

                    <SortableHeader
                      label="Views"
                      field="views"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort(
                        "views",
                        sortField,
                        sortDirection,
                        setSortField,
                        setSortDirection,
                      )}
                    />

                    <SortableHeader
                      label="Likes"
                      field="likes"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort(
                        "likes",
                        sortField,
                        sortDirection,
                        setSortField,
                        setSortDirection,
                      )}
                    />

                    <SortableHeader
                      label="Comments"
                      field="comments"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort(
                        "comments",
                        sortField,
                        sortDirection,
                        setSortField,
                        setSortDirection,
                      )}
                    />

                    <SortableHeader
                      label="Published"
                      field="date"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort(
                        "date",
                        sortField,
                        sortDirection,
                        setSortField,
                        setSortDirection,
                      )}
                    />
                  </tr>
                </thead>

                <tbody>
                  {sortedPosts.map((post) => (
                    <PostRow key={post._id} post={post} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * STAT CARD
 * ============================================================
 */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>

        <div className="rounded-lg bg-gray-100 p-2 text-gray-600">{icon}</div>
      </div>

      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

/*
 * ============================================================
 * SECONDARY METRIC
 * ============================================================
 */

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>

      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>

      <p className="mt-2 text-xs leading-5 text-gray-400">{description}</p>
    </div>
  );
}

/*
 * ============================================================
 * TOP POST CARD
 * ============================================================
 */

function TopPostCard({ post, rank }: { post: Post; rank: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
          #{rank}
        </span>

        <Eye size={18} className="text-gray-400" />
      </div>

      <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-semibold text-gray-900">
        {post.title}
      </h3>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-5">
        <SmallMetric icon={<Eye size={15} />} value={post.views} />

        <SmallMetric icon={<Heart size={15} />} value={post.likesCount} />

        <SmallMetric
          icon={<MessageCircle size={15} />}
          value={post.commentCount}
        />
      </div>
    </div>
  );
}

/*
 * ============================================================
 * SMALL METRIC
 * ============================================================
 */

function SmallMetric({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      {icon}
      <span className="font-medium text-gray-700">{formatNumber(value)}</span>
    </div>
  );
}

/*
 * ============================================================
 * TABLE ROW
 * ============================================================
 */

function PostRow({ post }: { post: Post }) {
  return (
    <tr className="border-b border-gray-100 transition hover:bg-gray-50">
      <td className="max-w-[400px] px-6 py-5">
        <p className="line-clamp-2 font-medium text-gray-900">{post.title}</p>
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <Eye size={15} className="text-gray-400" />
          <span className="font-medium">{formatNumber(post.views)}</span>
        </div>
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <Heart size={15} className="text-gray-400" />
          <span>{formatNumber(post.likesCount)}</span>
        </div>
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <MessageCircle size={15} className="text-gray-400" />
          <span>{formatNumber(post.commentCount)}</span>
        </div>
      </td>

      <td className="px-6 py-5">
        <div className="flex items-center gap-2 whitespace-nowrap text-gray-500">
          <CalendarDays size={15} />

          {new Date(post.createdAt).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      </td>
    </tr>
  );
}

/*
 * ============================================================
 * SORTABLE HEADER
 * ============================================================
 */

function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: () => void;
}) {
  const active = field === sortField;

  return (
    <th className="px-6 py-4">
      <button
        type="button"
        onClick={onSort}
        className={`flex items-center gap-1.5 transition ${
          active ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
        }`}
      >
        {label}

        {active && (
          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </th>
  );
}

/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyPosts() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
      <FileText size={38} className="mx-auto mb-4 text-gray-300" />

      <h3 className="font-semibold text-gray-700">No published posts yet</h3>

      <p className="mt-1 text-sm text-gray-400">
        Publish a post to start seeing its analytics here.
      </p>
    </div>
  );
}

/*
 * ============================================================
 * SORT HANDLER
 * ============================================================
 */

function handleSort(
  field: SortField,
  currentField: SortField,
  currentDirection: SortDirection,
  setField: React.Dispatch<React.SetStateAction<SortField>>,
  setDirection: React.Dispatch<React.SetStateAction<SortDirection>>,
) {
  return () => {
    if (field === currentField) {
      setDirection(currentDirection === "asc" ? "desc" : "asc");
    } else {
      setField(field);
      setDirection(field === "date" ? "desc" : "desc");
    }
  };
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function getSortLabel(field: SortField) {
  switch (field) {
    case "title":
      return "Post";

    case "views":
      return "Views";

    case "likes":
      return "Likes";

    case "comments":
      return "Comments";

    case "date":
      return "Published Date";

    default:
      return "Date";
  }
}
