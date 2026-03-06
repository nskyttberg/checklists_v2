"use client";
// lib/hooks/use-sidebar.ts
// Manages sidebar collapsed state, persisted in localStorage.
// Only imported by sidebar.tsx.

import { useState, useEffect } from "react";

const STORAGE_KEY = "aleris-sidebar-collapsed";

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  return { collapsed, toggle, mounted };
}
