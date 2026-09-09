"use client";

import { useAuth } from "../Context/AuthContext";
import { Bell, PenLine } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AuthModal from "./AuthModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ============================================================
   TYPES
============================================================ */

type Notification = {
  _id: string;

  receiver: string;

  sender?: {
    _id: string;
    username: string;
    profileImage?: string | null;
  };

  type: "invite" | "comment" | "mention";

  post?: {
    _id: string;
    title: string;
  };

  relatedInvite?: {
    _id: string;

    role: "editor" | "commenter";

    status: "pending" | "accepted" | "rejected";

    sender?: string;

    receiver?: string;

    post?: string;
  } | null;

  message: string;

  read: boolean;

  createdAt: string;
};

/* ============================================================
   PROPS
============================================================ */

type NavbarProps = {
  onMenuClick: () => void;
};

/* ============================================================
   API
============================================================ */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

/* ============================================================
   NAVBAR
============================================================ */

function Navbar({ onMenuClick }: NavbarProps) {
  const { user, loading, logout } = useAuth();

  const router = useRouter();

  /* ============================================================
     STATE
  ============================================================ */

  const [showAuthModal, setShowAuthModal] = useState(false);

  const [showMenu, setShowMenu] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [processingInviteId, setProcessingInviteId] = useState<string | null>(
    null,
  );

  const notifRef = useRef<HTMLDivElement>(null);

  /* ============================================================
     LOAD NOTIFICATIONS
  ============================================================ */

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          console.error(
            "[NAVBAR] Notification request failed:",
            response.status,
          );

          return;
        }

        const data = await response.json();

        console.log("[NAVBAR] Notifications:", data);

        const notificationList: Notification[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.notifications)
            ? data.notifications
            : [];

        if (!cancelled) {
          setNotifications(notificationList);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[NAVBAR] Failed to load notifications:", error);
        }
      }
    };

    /* ----------------------------------------------------------
       INITIAL LOAD
    ---------------------------------------------------------- */

    loadNotifications();

    /* ----------------------------------------------------------
       POLL EVERY 5 SECONDS
    ---------------------------------------------------------- */

    const interval = setInterval(loadNotifications, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  /* ============================================================
     CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  ============================================================ */

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ============================================================
     MARK NOTIFICATION AS READ
  ============================================================ */

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        console.error(
          "[NAVBAR] Failed to mark notification as read:",
          response.status,
        );

        return;
      }

      setNotifications((previous) =>
        previous.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                read: true,
              }
            : notification,
        ),
      );
    } catch (error) {
      console.error("[NAVBAR] Mark notification read error:", error);
    }
  };

  /* ============================================================
     ACCEPT INVITATION
  ============================================================ */

  const acceptInvite = async (
    inviteId: string,
    postId: string,
    notificationId: string,
  ) => {
    if (processingInviteId) {
      return;
    }

    if (!inviteId) {
      alert("Invitation ID is missing.");
      return;
    }

    if (!postId) {
      alert("Post ID is missing.");
      return;
    }

    try {
      setProcessingInviteId(inviteId);

      console.log("[NAVBAR] Accepting invitation:", {
        inviteId,
        postId,
      });

      const response = await fetch(
        `${API_BASE_URL}/invites/${inviteId}/accept`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      /* --------------------------------------------------------
           ERROR
        -------------------------------------------------------- */

      if (!response.ok) {
        console.error("[NAVBAR] Accept invitation failed:", {
          status: response.status,
          data,
        });

        alert(data?.message || data?.error || "Failed to accept invitation.");

        return;
      }

      console.log("[NAVBAR] Invitation accepted:", data);

      /* --------------------------------------------------------
           USE POST ID FROM BACKEND
        -------------------------------------------------------- */

      const acceptedPostId = data?.post?._id || data?.postId || postId;

      if (!acceptedPostId) {
        alert("Invitation accepted, but the post could not be opened.");

        return;
      }

      /* --------------------------------------------------------
           UPDATE NOTIFICATION LOCALLY
        -------------------------------------------------------- */

      setNotifications((previous) =>
        previous.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                read: true,
                relatedInvite: notification.relatedInvite
                  ? {
                      ...notification.relatedInvite,
                      status: "accepted",
                    }
                  : notification.relatedInvite,
              }
            : notification,
        ),
      );

      /* --------------------------------------------------------
           CLOSE DROPDOWN
        -------------------------------------------------------- */

      setShowNotifications(false);

      /* --------------------------------------------------------
           OPEN SAME POST
        -------------------------------------------------------- */

      console.log("[NAVBAR] Opening collaborative post:", acceptedPostId);

      router.push(`/post/${acceptedPostId}/edit`);
    } catch (error) {
      console.error("[NAVBAR] Accept invitation error:", error);

      alert(
        error instanceof Error ? error.message : "Failed to accept invitation.",
      );
    } finally {
      setProcessingInviteId(null);
    }
  };

  /* ============================================================
     REJECT INVITATION
  ============================================================ */

  const rejectInvite = async (inviteId: string, notificationId: string) => {
    if (processingInviteId) {
      return;
    }

    if (!inviteId) {
      alert("Invitation ID is missing.");
      return;
    }

    try {
      setProcessingInviteId(inviteId);

      console.log("[NAVBAR] Rejecting invitation:", inviteId);

      const response = await fetch(
        `${API_BASE_URL}/invites/${inviteId}/reject`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("[NAVBAR] Reject invitation failed:", {
          status: response.status,
          data,
        });

        alert(data?.message || data?.error || "Failed to decline invitation.");

        return;
      }

      console.log("[NAVBAR] Invitation rejected:", inviteId);

      /* --------------------------------------------------------
           UPDATE NOTIFICATION LOCALLY
        -------------------------------------------------------- */

      setNotifications((previous) =>
        previous.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                read: true,
                relatedInvite: notification.relatedInvite
                  ? {
                      ...notification.relatedInvite,
                      status: "rejected",
                    }
                  : notification.relatedInvite,
              }
            : notification,
        ),
      );
    } catch (error) {
      console.error("[NAVBAR] Reject invitation error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to decline invitation.",
      );
    } finally {
      setProcessingInviteId(null);
    }
  };

  /* ============================================================
     UNREAD COUNT
  ============================================================ */

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return <nav className="w-full h-14 border-b bg-white" />;
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <nav className="w-full h-14 px-6 text-black flex items-center justify-between border-b bg-white">
      {/* ======================================================
          LEFT SIDE
      ====================================================== */}

      <div className="flex items-center gap-4">
        {user && (
          <button
            type="button"
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
        )}

        <span className="text-2xl font-serif font-bold tracking-tight">
          Blogie
        </span>
      </div>

      {/* ======================================================
          RIGHT SIDE
      ====================================================== */}

      <div className="flex items-center gap-10">
        {/* ====================================================
            WRITE
        ==================================================== */}

        {user && (
          <Link
            href="/NewPost"
            className="flex items-center gap-1 text-sm text-gray-700 hover:text-black"
          >
            <PenLine className="w-4 h-4" />

            <span className="hidden sm:block">Write</span>
          </Link>
        )}

        {/* ====================================================
            NOTIFICATIONS
        ==================================================== */}

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="relative cursor-pointer p-1"
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }

              setShowNotifications((previous) => !previous);
            }}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-700 hover:text-black" />

            {/* ==================================================
                UNREAD BADGE
            ================================================== */}

            {user && unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </button>

          {/* ==================================================
              NOTIFICATION DROPDOWN
          ================================================== */}

          {showNotifications && user && (
            <div className="absolute right-0 mt-3 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
              {/* HEADER */}

              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-gray-800">
                    Notifications
                  </h4>

                  {unreadCount > 0 && (
                    <span className="text-xs text-gray-500">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
              </div>

              {/* BODY */}

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-sm text-gray-500 text-center">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notification) => {
                    /*
                     * IMPORTANT:
                     *
                     * The notification now contains
                     * the exact invite.
                     */
                    const invite = notification.relatedInvite;

                    const isProcessing = processingInviteId === invite?._id;

                    return (
                      <div
                        key={notification._id}
                        className={`p-4 border-b last:border-b-0 transition-colors ${
                          notification.read ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* UNREAD DOT */}

                          <div className="pt-1">
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                          </div>

                          <div className="flex-1">
                            {/* MESSAGE */}

                            <p className="text-sm text-gray-700 leading-5">
                              {notification.message}
                            </p>

                            {/* DATE */}

                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(
                                notification.createdAt,
                              ).toLocaleString()}
                            </p>

                            {/* =================================================
                                    COLLABORATION INVITATION
                                ================================================= */}

                            {notification.type === "invite" && (
                              <>
                                {invite && invite.status === "pending" ? (
                                  <div className="flex gap-2 mt-3">
                                    {/* ACCEPT */}

                                    <button
                                      type="button"
                                      disabled={isProcessing}
                                      onClick={() =>
                                        acceptInvite(
                                          invite._id,
                                          notification.post?._id || "",
                                          notification._id,
                                        )
                                      }
                                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white px-3 py-1.5 text-xs font-medium rounded-md transition-colors w-full"
                                    >
                                      {isProcessing ? "Accepting..." : "Accept"}
                                    </button>

                                    {/* DECLINE */}

                                    <button
                                      type="button"
                                      disabled={isProcessing}
                                      onClick={() =>
                                        rejectInvite(
                                          invite._id,
                                          notification._id,
                                        )
                                      }
                                      className="bg-gray-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-3 py-1.5 text-xs font-medium rounded-md transition-colors w-full"
                                    >
                                      {isProcessing ? "..." : "Decline"}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-3 text-xs text-gray-400">
                                    This invitation is no longer pending.
                                  </div>
                                )}
                              </>
                            )}

                            {/* =================================================
                                    MARK AS READ
                                ================================================= */}

                            {!notification.read && (
                              <button
                                type="button"
                                onClick={() =>
                                  markNotificationAsRead(notification._id)
                                }
                                className="mt-2 text-xs text-gray-500 hover:text-black underline"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            LOGIN / USER AVATAR
        ==================================================== */}

        {!user ? (
          <button
            type="button"
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
              width={40}
              height={40}
              className="w-10 h-10 rounded-full cursor-pointer object-cover"
              onClick={() => setShowMenu((previous) => !previous)}
            />

            {/* USER MENU */}

            {showMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-md z-50">
                <button
                  type="button"
                  onClick={() => {
                    logout();

                    setShowMenu(false);

                    setShowNotifications(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====================================================
            AUTH MODAL
        ==================================================== */}

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
    </nav>
  );
}

export default Navbar;
