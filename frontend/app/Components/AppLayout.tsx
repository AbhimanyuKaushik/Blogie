"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../Context/AuthContext";

const SIDEBAR_WIDTH = 240;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = useAuth();
  return (
    <div className="h-screen overflow-hidden bg-white">
      <div className="fixed top-0 left-0 right-0 z-50 h-16">
        <Navbar onMenuClick={() => setIsSidebarOpen((prev) => !prev)} />
      </div>

      <div className="flex pt-14 h-full">
        {user ? (
          <div
            style={{ width: isSidebarOpen ? SIDEBAR_WIDTH : 0 }}
            className="fixed left-0 top-14 h-[calc(100vh-64px)]
                     transition-[width] duration-500
                     ease-[cubic-bezier(0.2,0,0,1)]
                     overflow-hidden border-r bg-white z-40"
          >
            <Sidebar />
          </div>
        ) : null}

        <main
          style={{ marginLeft: isSidebarOpen ? SIDEBAR_WIDTH : 0 }}
          className="flex-1 px-6 py-6 h-[calc(100vh-64px)]
                     overflow-y-auto
                     transition-[margin] duration-300
                     ease-[cubic-bezier(0.2,0,0,1)]"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
