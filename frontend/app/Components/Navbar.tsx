"use client";

import Link from "next/link";

import {
  Bell,
  PenLine,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  useAuth,
} from "../Context/AuthContext";

import {
  useSocket,
} from "../Context/SocketContext";

import AuthModal from "./AuthModal";

type NavbarProps = {
  onMenuClick:
    () => void;
};

function Navbar({
  onMenuClick,
}: NavbarProps) {

  const {
    user,
    loading,
    logout,
  } = useAuth();

  const {
    notifications,
  } =
    useSocket();

  const [
    showAuthModal,
    setShowAuthModal,
  ] =
    useState(
      false,
    );

  const [
    showMenu,
    setShowMenu,
  ] =
    useState(
      false,
    );

  const [
    showNotifications,
    setShowNotifications,
  ] =
    useState(
      false,
    );

  const unreadCount =
    notifications.filter(
      (n) =>
        !n.isRead,
    ).length;

  if (loading) {
    return (
      <nav className="w-full h-14 border-b bg-white" />
    );
  }

  return (
    <nav className="w-full h-14 px-6 text-black flex items-center justify-between border-b bg-white">

      <div className="flex items-center gap-4">

        {user ? (
          <button
            onClick={
              onMenuClick
            }
            className="p-1 rounded hover:bg-gray-100"
          >
            ☰
          </button>
        ) : null}

        <span className="text-2xl font-serif font-bold">
          Blogie
        </span>

      </div>

      <div className="flex items-center gap-8">

        {user && (
          <Link
            href="/NewPost"
            className="flex items-center gap-1"
          >
            <PenLine className="w-4 h-4" />

            <span>
              Write
            </span>
          </Link>
        )}

        {/* BELL */}

        {user && (
          <div className="relative">

            <button
              onClick={() =>
                setShowNotifications(
                  !showNotifications,
                )
              }
              className="relative"
            >

              <Bell className="w-5 h-5" />

              {unreadCount >
                0 && (
                <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  {
                    unreadCount
                  }
                </span>
              )}

            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">

                <div className="p-3 border-b font-medium">
                  Notifications
                </div>

                {notifications.length ===
                0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map(
                    (
                      notification,
                      i,
                    ) => (
                      <Link
                        key={
                          notification._id ||
                          i
                        }
                        href={`/NewPost/${notification.post?._id} : #`}
                        className="block p-3 border-b hover:bg-gray-50"
                      >
                        <p className="text-sm">
                          {
                            notification.message
                          }
                        </p>

                        {notification.post && (
                          <p className="text-xs text-gray-500 mt-1">
                            {
                              notification.post.title
                            }
                          </p>
                        )}
                      </Link>
                    ),
                  )
                )}

              </div>
            )}

          </div>
        )}

        {/* USER */}

        {!user ? (
          <button
            onClick={() =>
              setShowAuthModal(
                true,
              )
            }
            className="bg-green-600 text-white px-4 h-8 rounded text-sm"
          >
            Login /
            Signup
          </button>
        ) : (
          <div className="relative">

            <img
              src={
                user.profileImage ||
                "/default-avatar.png"
              }
              alt="avatar"
              width={36}
              height={36}
              className="rounded-full cursor-pointer"
              onClick={() =>
                setShowMenu(
                  !showMenu,
                )
              }
            />

            {showMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-md">

                <button
                  onClick={() => {
                    logout();

                    setShowMenu(
                      false,
                    );
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
          <AuthModal
            onClose={() =>
              setShowAuthModal(
                false,
              )
            }
          />
        )}

      </div>

    </nav>
  );
}

export default Navbar;