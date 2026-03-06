"use client";
// app/(admin)/_components/admin-shell.tsx
// Replaces app-shell.tsx. Mounts UserProvider, Sidebar, Topbar, and main content.
// No logic here — purely structural.
//
// margin-left on the body div tracks sidebar width via CSS transition,
// keeping it in sync with the sidebar animation.

import { UserProvider } from "@/lib/user-context";
import { AdminNavProvider } from "@/lib/contexts/admin-nav-context";
import { Sidebar } from "./sidebar/sidebar";
import { Topbar } from "./topbar/topbar";

const TOPBAR_H  = 52;   // px — always reserved even when topbar is hidden
const SIDEBAR_W = 220;  // px — expanded default (JS updates CSS var after mount)

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AdminNavProvider>
        <Sidebar />
        <Topbar />

        {/*
          Body div:
          - margin-left matches sidebar width, transitions with it
          - padding-top always reserves topbar height to prevent layout jumps
          - CSS var --sidebar-w is set by Sidebar on mount + every toggle
        */}
        <div
          id="admin-body"
          className="transition-[margin-left] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            marginLeft: SIDEBAR_W,
            paddingTop: TOPBAR_H,
          }}
        >
          <main className="min-h-[calc(100vh-52px)] bg-sand">
            <div className="max-w-6xl mx-auto px-6 sm:px-8 py-7">
              {children}
            </div>
          </main>
        </div>
      </AdminNavProvider>
    </UserProvider>
  );
}
