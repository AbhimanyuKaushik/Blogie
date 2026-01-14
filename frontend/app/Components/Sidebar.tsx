"use client";

import React from "react";
import {
  Home,
  Bookmark,
  User,
  FileText,
  BarChart2,
  Users,
} from "lucide-react";

function Sidebar() {
  return (
    <aside className="w-60 min-h-screen border-r px-4 py-6 text-sm text-gray-700">
      <nav className="flex flex-col gap-2">
        <SidebarItem icon={<Home size={18} />} label="Home" active />
        <SidebarItem icon={<Bookmark size={18} />} label="Library" />
        <SidebarItem icon={<User size={18} />} label="Profile" />
        <SidebarItem icon={<FileText size={18} />} label="Posts" />
        <SidebarItem icon={<BarChart2 size={18} />} label="Stats" />
      </nav>

      <hr className="my-6" />

      <div className="flex flex-col gap-3">
        <SidebarItem icon={<Users size={18} />} label="Following" />
      </div>
    </aside>
  );
}

type SidebarItemProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

function SidebarItem({ icon, label, active = false }: SidebarItemProps) {
  return (
    <div
      className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer
        ${
          active ? "font-medium text-black" : "text-gray-600 hover:text-black"
        }`}
    >
      <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
      <span>{label}</span>
      {active && <div className="ml-auto w-1 h-4 bg-black rounded-full" />}
    </div>
  );
}

export default Sidebar;
