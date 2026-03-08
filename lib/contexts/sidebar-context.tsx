"use client";
// lib/contexts/sidebar-context.tsx

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "aleris-sidebar-collapsed";

export const W_EXPANDED  = 220;
export const W_COLLAPSED = 56;

interface SidebarContextValue {
  collapsed: boolean;
  mounted:   boolean;
  width:     number;
  toggle:    () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const width = mounted ? (collapsed ? W_COLLAPSED : W_EXPANDED) : W_EXPANDED;

  return (
    <SidebarContext.Provider value={{ collapsed, mounted, width, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebarContext must be used within SidebarProvider");
  return ctx;
}
