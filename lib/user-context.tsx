"use client";
// lib/user-context.tsx
// Dev-only user switcher. Replaced by real auth at launch.

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
  const [allUsers, setAllUsers]       = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      const { data: empData, error } = await supabase
        .from("employee")
        .select("id, name, email, site, status, auth_user_id, created_at")
        .neq("status", "inactive")
        .order("name");

      if (error || !empData) {
        console.error("Failed to load employees:", error);
        setLoading(false);
        return;
      }

      // Fetch all active roles — any role grants has_admin_access
      const { data: roleData } = await supabase
        .from("employee_role")
        .select("employee_id, role")
        .is("revoked_at", null);

      const employeesWithRole = new Set(
        (roleData ?? []).map(r => r.employee_id)
      );

      const employees: Employee[] = empData.map(emp => ({
        ...emp,
        has_admin_access: employeesWithRole.has(emp.id),
      })) as Employee[];

      setAllUsers(employees);

      const savedId = sessionStorage.getItem(SESSION_KEY);
      const saved   = savedId ? employees.find(e => e.id === savedId) : null;
      setCurrentUser(saved ?? employees[0] ?? null);
      setLoading(false);
    }

    load();
  }, []);

  function switchUser(id: string) {
    const user = allUsers.find(e => e.id === id);
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