"use client";
// lib/user-context.tsx
// Dev-only user switcher. Replaced by real auth at launch.
// Reads from employee table in schema v3.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Employee } from "@/lib/types";

interface UserContextValue {
  currentUser: Employee | null;
  allUsers: Employee[];
  switchUser: (id: string) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  allUsers: [],
  switchUser: () => {},
  loading: true,
});

const SESSION_KEY = "dev_current_user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [allUsers, setAllUsers] = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("employee")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error || !data) {
        console.error("Failed to load employees:", error);
        setLoading(false);
        return;
      }

      setAllUsers(data);

      const savedId = sessionStorage.getItem(SESSION_KEY);
      const saved = savedId ? data.find((e) => e.id === savedId) : null;
      setCurrentUser(saved ?? data[0] ?? null);
      setLoading(false);
    }

    load();
  }, []);

  function switchUser(id: string) {
    const user = allUsers.find((e) => e.id === id);
    if (!user) return;
    sessionStorage.setItem(SESSION_KEY, id);
    setCurrentUser(user);
  }

  return (
    <UserContext.Provider value={{ currentUser, allUsers, switchUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
