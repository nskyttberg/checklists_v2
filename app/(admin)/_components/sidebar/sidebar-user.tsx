"use client";
// app/(admin)/_components/sidebar/sidebar-user.tsx
// User card + "Gå till min vy" + "Logga ut" at the bottom of the sidebar.
// Uses existing useUser() / UserContext — swap for useAuth() when auth lands.

import Link from "next/link";
import { useUser } from "@/lib/user-context";
import { getInitials } from "@/lib/ui/primitives";

const SwitchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7h10M8.5 4L12 7l-3.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5.5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2.5M9.5 9.5L12 7l-2.5-2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const { currentUser } = useUser();

  if (!currentUser) return null;

  const initials = getInitials(currentUser.name);

  return (
    <div className="flex-shrink-0 border-t border-white/[0.08] px-1.5 pb-2.5 pt-2">
      {/* User card */}
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 select-none">
          {initials}
        </div>
        <div
          className={`overflow-hidden transition-opacity duration-150 ${
            collapsed ? "opacity-0 w-0" : "opacity-100"
          }`}
        >
          <div className="text-[13px] font-semibold text-white whitespace-nowrap">
            {currentUser.name}
          </div>
          <div className="text-[11px] text-petrol-60 whitespace-nowrap">
            {currentUser.is_admin ? "Administratör" : "Medarbetare"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-0.5 mt-1">
        <Link
          href="/my"
          className="group relative flex items-center gap-2.5 px-2 h-[34px] rounded-lg text-petrol-60 hover:bg-white/[0.07] hover:text-accent-60 transition-colors duration-100"
        >
          <span className="flex-shrink-0 w-[18px] flex items-center justify-center">
            <SwitchIcon />
          </span>
          <span
            className={`text-[12.5px] whitespace-nowrap transition-opacity duration-150 ${
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            }`}
          >
            Gå till min vy
          </span>
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-2 bg-petrol-80 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
              Gå till min vy
            </span>
          )}
        </Link>

        <button
          onClick={() => {
            // TODO: supabase.auth.signOut() — see auth-implementation-guide.md
            console.warn("Sign out not yet implemented");
          }}
          className="group relative flex items-center gap-2.5 px-2 h-[34px] w-full text-left rounded-lg text-petrol-60 hover:bg-white/[0.07] hover:text-white transition-colors duration-100"
        >
          <span className="flex-shrink-0 w-[18px] flex items-center justify-center">
            <LogoutIcon />
          </span>
          <span
            className={`text-[12.5px] whitespace-nowrap transition-opacity duration-150 ${
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            }`}
          >
            Logga ut
          </span>
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-2 bg-petrol-80 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
              Logga ut
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
