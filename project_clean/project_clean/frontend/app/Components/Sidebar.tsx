"use client";
import React, { useState } from "react";
import { Home, Bookmark, User, BarChart2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

function Sidebar() {
  const router = useRouter();
  const [activeItem,setActiveItem] = useState("")
  return (
    <aside className="w-60 min-h-screen border-r px-4 py-6 text-sm text-gray-700">
      <nav className="flex flex-col gap-2">
        <button onClick={() => { setActiveItem("Home"); router.push("/"); }}>
          <SidebarItem icon={<Home size={18} />} label="Home" active={activeItem === "Home"} />
        </button>
        <button onClick={() => { setActiveItem("Library"); router.push("/Library"); }}>
          <SidebarItem icon={<Bookmark size={18} />} label="Library" active={activeItem === "Library"} />
        </button>
        <button onClick={() => { setActiveItem("Profile"); router.push("/Profile"); }}>
          <SidebarItem icon={<User size={18} />} label="Profile" active={activeItem === "Profile"} />
        </button>
        <button onClick={() => { setActiveItem("Stats"); router.push("/Stats"); }}>
          <SidebarItem icon={<BarChart2 size={18} />} label="Stats" active={activeItem === "Stats"} />
        </button>
      </nav>

      <hr className="my-6" />

      <div className="flex flex-col gap-3">
        <button onClick={() => { setActiveItem("Following"); router.push("/Following"); }}>
          <SidebarItem icon={<Users size={18} />} label="Following" active={activeItem === "Following"} />
        </button>
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
