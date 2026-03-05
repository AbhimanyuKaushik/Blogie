"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Stats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalReach: number;
}

interface Post {
  _id: string;
  title: string;
  views: number;
  likesCount: number;
  commentCount: number;
  createdAt: string;
}

interface ChartDataPoint {
  date: string;
  views: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch("http://localhost:5000/api/stats/creator", {
        credentials: "include",
      });

      const data = await res.json();

      setStats(data.summary);
      setPosts(data.posts);

      // transform posts into chart data
      const sorted = [...data.posts].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      );

      const graph = sorted.map((p: Post) => ({
        date: new Date(p.createdAt).toLocaleDateString(),
        views: p.views,
      }));

      setChartData(graph);
    }

    fetchStats();
  }, []);

  if (!stats) return <div className="p-10">Loading analytics...</div>;

  return (
    <div className="p-10 text-black bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-semibold mb-8">Analytics</h1>

      {/* KPI CARDS */}
      <div className="grid grid-cols-5 gap-6 mb-10">
        <StatCard title="Posts" value={stats.totalPosts} />
        <StatCard title="Views" value={stats.totalViews} />
        <StatCard title="Likes" value={stats.totalLikes} />
        <StatCard title="Comments" value={stats.totalComments} />
        <StatCard title="Reach" value={stats.totalReach} />
      </div>

      {/* MAIN GRAPH */}
      <div className="bg-white rounded-xl shadow p-6 mb-10">
        <h2 className="text-lg font-medium mb-4">Views Over Time</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#3b82f6"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* POST PERFORMANCE */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium">Post Performance</h2>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-4">Post</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {posts.map((post) => (
              <tr key={post._id} className="border-t hover:bg-gray-50">
                <td className="p-4 font-medium">{post.title}</td>
                <td>{post.views}</td>
                <td>{post.likesCount}</td>
                <td>{post.commentCount}</td>
                <td>
                  {new Date(post.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white shadow rounded-xl p-6">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}