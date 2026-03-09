"use client";
// app/(admin)/_components/admin-shell.tsx

import { UserProvider } from "@/lib/user-context";
import { AdminNavProvider } from "@/lib/contexts/admin-nav-context";
import { SidebarProvider, useSidebarContext } from "@/lib/contexts/sidebar-context";
import { Sidebar } from "./sidebar/sidebar";
import { Topbar } from "./topbar/topbar";

const TOPBAR_H = 52;

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { width } = useSidebarContext();

  return (
    <>
      <Sidebar />
      <Topbar />
      <div
        id="admin-body"
        className="transition-[margin-left] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          marginLeft: width,
          paddingTop: TOPBAR_H,
        }}
      >
        <main className="min-h-[calc(100vh-52px)] bg-sand">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 py-7">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AdminNavProvider>
        <SidebarProvider>
          <AdminShellInner>{children}</AdminShellInner>
        </SidebarProvider>
      </AdminNavProvider>
    </UserProvider>
  );
}