"use client";

import { useEffect, useState } from "react";

type Invite = {
  _id: string;
  role: "editor" | "commenter";
  sender: {
    username: string;
  };
  post: {
    title: string;
  };
};

export default function Notification() {
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const loadInvites = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/invites", {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await res.json();
        setInvites(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to fetch invites", err);
        }
      }
    };

    loadInvites();

    return () => controller.abort();
  }, []);

  const acceptInvite = async (id: string) => {
    await fetch(`http://localhost:5000/api/invites/${id}/accept`, {
      method: "PATCH",
      credentials: "include",
    });

    setInvites((prev) => prev.filter((i) => i._id !== id));
  };

  const rejectInvite = async (id: string) => {
    await fetch(`http://localhost:5000/api/invites/${id}/reject`, {
      method: "PATCH",
      credentials: "include",
    });

    setInvites((prev) => prev.filter((i) => i._id !== id));
  };

  if (!invites.length) return null;

  return (
    <div className="fixed top-4 right-4 bg-white shadow p-4 rounded w-80 z-50">
      <h4 className="font-semibold mb-2">Invitations</h4>

      {invites.map((invite) => (
        <div key={invite._id} className="border-b py-2">
          <p className="text-sm">
            <b>{invite.sender.username}</b> invited you to collaborate on{" "}
            <b>{invite.post.title}</b>
          </p>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => acceptInvite(invite._id)}
              className="bg-green-600 text-white px-2 py-1 text-xs rounded"
            >
              Accept
            </button>

            <button
              onClick={() => rejectInvite(invite._id)}
              className="bg-red-500 text-white px-2 py-1 text-xs rounded"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
