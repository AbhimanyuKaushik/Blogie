"use client";
import Image from "next/image";
import { useAuth } from "../Context/AuthContext";
import { Bell, PenLine } from "lucide-react";
import { useState } from "react";
import AuthModal from "./AuthModal";
import Link from "next/link";

type NavbarProps = {
  onMenuClick: () => void;
};

function Navbar({ onMenuClick }: NavbarProps) {
  const { user, loading, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
        <Bell className="w-5 h-5 cursor-pointer text-gray-700 hover:text-black" />
        {!user ? (
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-green-600 text-white px-4 h-8 rounded text-sm"
          >
            Login / Signup
          </button>
        ) : (
          <div className="relative">
            <Image
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

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
    </nav>
  );
}

export default Navbar;
