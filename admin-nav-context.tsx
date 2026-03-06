"use client";
// lib/contexts/admin-nav-context.tsx
// Provides topbar context to all admin pages.
// Deep pages call setTopbarContext() in useEffect on mount, clear on unmount.
// Top-level pages never call it — topbar stays hidden automatically.

import { createContext, useContext, useState, type ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BadgeVariant = "default" | "active" | "draft";
export type TopbarObjectType = "staff" | "template";

export interface TopbarCtx {
  type: TopbarObjectType;
  /** Primary name — employee name or template name */
  name: string;
  /** Secondary line — "BMA · Hjärta" or "Version 2 · Utkast" */
  meta: string;
  /** Initials for circular avatar (staff). Omit for template (uses icon). */
  initials?: string;
  /** Right-side badge text */
  badge?: string;
  badgeVariant?: BadgeVariant;
  /** Back button */
  backLabel: string;
  backHref: string;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AdminNavValue {
  topbarCtx: TopbarCtx | null;
  setTopbarContext: (ctx: TopbarCtx | null) => void;
}

const AdminNavContext = createContext<AdminNavValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const [topbarCtx, setTopbarContext] = useState<TopbarCtx | null>(null);
  return (
    <AdminNavContext.Provider value={{ topbarCtx, setTopbarContext }}>
      {children}
    </AdminNavContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAdminNav(): AdminNavValue {
  const ctx = useContext(AdminNavContext);
  if (!ctx) throw new Error("useAdminNav must be used within AdminNavProvider");
  return ctx;
}
