"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";

// -------------------------------------------------
// Types
// -------------------------------------------------

export interface Employee {
  id: string;
  email: string;
  name: string;
  role: string;
  site: string | null;
  active: boolean;
}

interface UserContextValue {
  currentUser: Employee | null;
  allUsers: Employee[];
  switchUser: (employeeId: string) => void;
  loading: boolean;
}

// -------------------------------------------------
// Context
// -------------------------------------------------

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  allUsers: [],
  switchUser: () => {},
  loading: true,
});

export function useUser() {
  return useContext(UserContext);
}

// -------------------------------------------------
// Provider
// -------------------------------------------------

export function UserProvider({ children }: { children: ReactNode }) {
  const [allUsers, setAllUsers] = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all employees on mount
  useEffect(() => {
    async function fetchEmployees() {
      const { data, error } = await supabase
        .from("employee")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) {
        console.error("Failed to fetch employees:", error.message);
        setLoading(false);
        return;
      }

      setAllUsers(data || []);

      // Restore last selected user from memory, or pick first
      const savedId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("dev_current_user")
          : null;
      const restored = data?.find((e: Employee) => e.id === savedId);
      setCurrentUser(restored || data?.[0] || null);
      setLoading(false);
    }

    fetchEmployees();
  }, []);

  function switchUser(employeeId: string) {
    const user = allUsers.find((e) => e.id === employeeId) || null;
    setCurrentUser(user);
    if (typeof window !== "undefined" && user) {
      sessionStorage.setItem("dev_current_user", user.id);
    }
  }

  return (
    <UserContext.Provider value={{ currentUser, allUsers, switchUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}