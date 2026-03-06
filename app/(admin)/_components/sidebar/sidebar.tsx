"use client";
// app/(admin)/_components/sidebar/sidebar.tsx

import { useEffect } from "react";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { SidebarLogo } from "./sidebar-logo";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUser } from "./sidebar-user";

const W_EXPANDED  = 220;
const W_COLLAPSED = 56;

export function Sidebar() {
  const { collapsed, toggle, mounted } = useSidebar();
  const width = mounted ? (collapsed ? W_COLLAPSED : W_EXPANDED) : W_EXPANDED;

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${width}px`);
  }, [width]);

  return (
    <aside
      style={{ width }}
      className="
        fixed top-0 left-0 bottom-0 z-50
        bg-petrol flex flex-col
        transition-[width] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
      "
    >
      {/* Collapse toggle — sits outside the overflow-hidden inner wrapper */}
      <button
        onClick={toggle}
        aria-label={collapsed ? "Expandera sidebar" : "Fäll ihop sidebar"}
        className="
          absolute top-[15px] -right-3 z-20
          w-6 h-6 bg-white border border-slate rounded-full
          flex items-center justify-center
          shadow-sm hover:bg-sand transition-colors duration-150
        "
      >
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{
            transform: collapsed ? "rotate(180deg)" : "none",
            transition: "transform 0.22s",
          }}
        >
          <path
            d="M8 2L4 6L8 10"
            stroke="#004851"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Inner wrapper clips the content (nav labels etc.) but not the toggle button */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <SidebarLogo collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        <SidebarUser collapsed={collapsed} />
      </div>
    </aside>
  );
}