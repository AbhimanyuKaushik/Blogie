"use client";

import Image from "next/image";
import { useAuth } from "../Context/AuthContext";
import { Bell, PenLine } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AuthModal from "./AuthModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Invite = {
  _id: string;
  role: "editor" | "commenter";
  sender: { username: string };
  post: { _id: string; title: string };
};

type NavbarProps = {
  onMenuClick: () => void;
};

function Navbar({ onMenuClick }: NavbarProps) {
  const { user, loading, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const loadInvites = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/invites", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setInvites(Array.isArray(data) ? data : data.invites || []);
      } catch (err) {
        console.error("Failed to fetch invites", err);
      }
    };

    loadInvites();
    const interval = setInterval(loadInvites, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const acceptInvite = async (id: string, postId: string) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/invites/${id}/accept`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Failed to accept invite");
        return;
      }
      setInvites((prev) => prev.filter((i) => i._id !== id));
      setShowNotifications(false);
      router.push(`/post/${postId}/edit`);
    } catch (err) {
      console.error(err);
      alert("Failed to accept invite");
    }
  };

  const rejectInvite = async (id: string) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/invites/${id}/reject`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Failed to decline invite");
        return;
      }
      setInvites((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to decline invite");
    }
  };

  if (loading) {
    return <nav className="w-full h-14 border-b bg-white" />;
  }

  return (
    <nav className="w-full h-14 px-6 text-black flex items-center justify-between border-b bg-white">
      <div className="flex items-center gap-4">
        {user ? (
          <button
            onClick={onMenuClick}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        ) : null}

        <span className="text-2xl font-serif font-bold tracking-tight">
          Blogie
        </span>
      </div>

      <div className="flex items-center gap-10">
        {user ? (
          <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-black">
            <PenLine className="w-4 h-4" />
            <Link href={"/NewPost"}>
              <span className="hidden sm:block">Write</span>
            </Link>
          </button>
        ) : null}

        {/* ─── Notification Bell ─────────────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <div
            className="relative cursor-pointer"
            onClick={() => user && setShowNotifications(!showNotifications)}
          >
            <Bell className="w-5 h-5 text-gray-700 hover:text-black" />
            {invites.length > 0 && (
              <div className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                {invites.length}
              </div>
            )}
          </div>

          {showNotifications && user && (
            <div className="absolute right-0 mt-3 w-80 bg-white border rounded-lg shadow-xl z-50">
              <div className="p-3 border-b bg-gray-50 rounded-t-lg">
                <h4 className="font-semibold text-sm text-gray-800">
                  Notifications
                </h4>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {invites.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500 text-center">
                    No new notifications
                  </div>
                ) : (
                  invites.map((invite) => (
                    <div
                      key={invite._id}
                      className="p-4 border-b hover:bg-gray-50 transition-colors last:border-b-0"
                    >
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-black">
                          {invite.sender?.username}
                        </span>{" "}
                        invited you to collaborate on{" "}
                        <span className="font-semibold text-black">
                          {invite.post?.title || "Untitled Post"}
                        </span>
                        <span className="ml-1 text-xs text-gray-500">
                          ({invite.role})
                        </span>
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() =>
                            acceptInvite(invite._id, invite.post._id)
                          }
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs font-medium rounded-md transition-colors w-full"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => rejectInvite(invite._id)}
                          className="bg-gray-200 hover:bg-red-50 hover:text-red-600 text-gray-700 px-3 py-1.5 text-xs font-medium rounded-md transition-colors w-full"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {!user ? (
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-green-600 text-white px-4 h-8 rounded text-sm"
          >
            Login / Signup
          </button>
        ) : (
          <div className="relative">
            <img
              src={user.profileImage || "/default-avatar.png"}
              alt="User avatar"
              width={64}
              height={64}
              className="rounded-full cursor-pointer"
              onClick={() => setShowMenu(!showMenu)}
            />

            {showMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-md">
                <button
                  onClick={() => {
                    logout();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}

        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </div>
    </nav>
  );
}

export default Navbar;