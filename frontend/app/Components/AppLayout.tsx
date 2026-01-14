"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const SIDEBAR_WIDTH = 240;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

  return (
    <div className="min-h-screen bg-white">
      <Navbar onMenuClick={() => setIsSidebarOpen(prev => !prev)} />
      <div className="flex">
        <div
          style={{ width: isSidebarOpen ? SIDEBAR_WIDTH : 0 }}
          className="transition-[width] duration-500 ease-[cubic-bezier(0.2,0,0,1)] overflow-hidden"
        >
          <Sidebar />
        </div>
        <main
          className="flex-1 px-6 py-6 transition-[margin] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
