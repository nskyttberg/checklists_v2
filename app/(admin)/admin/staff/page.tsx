"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Employee {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  site: string | null;
  active: boolean;
}

export default function StaffPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");

  useEffect(() => {
    async function fetchEmployees() {
      const { data, error } = await supabase
        .from("employee")
        .select("id, name, email, is_admin, site, active")
        .eq("active", true)
        .order("name");

      if (error) console.error("Failed to fetch employees:", error.message);
      else setEmployees(data || []);
      setLoading(false);
    }
    fetchEmployees();
  }, []);

  const sites = Array.from(
    new Set(employees.map((e) => e.site).filter(Boolean))
  ).sort() as string[];

  const lowerSearch = search.toLowerCase();
  const filtered = employees.filter((emp) => {
    const matchesSearch =
      !lowerSearch ||
      emp.name.toLowerCase().includes(lowerSearch) ||
      emp.email.toLowerCase().includes(lowerSearch);
    const matchesSite = !siteFilter || emp.site === siteFilter;
    return matchesSearch && matchesSite;
  });

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Laddar...</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-white rounded-xl border border-slate p-10 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-petrol">Inga medarbetare ännu</h1>
          <p className="text-petrol-60 mt-2">
            Medarbetare läggs till via databasimport eller direkt i systemet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-petrol">Medarbetare</h1>
      </div>

      {/* Search and filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Sök på namn eller e-post..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate rounded-lg bg-white text-petrol placeholder-petrol-60 focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm flex-1 max-w-xs"
        />
        {sites.length > 1 && (
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="border border-slate rounded-lg bg-white text-petrol focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm"
          >
            <option value="">Alla enheter</option>
            {sites.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate bg-cream">
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Namn</th>
              <th className="text-left px-4 py-3 font-medium text-petrol-80">E-post</th>
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Roll</th>
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Enhet</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr
                key={emp.id}
                onClick={() => router.push(`/admin/staff/${emp.id}`)}
                className="border-b border-slate/50 hover:bg-cream transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-petrol font-medium">{emp.name}</td>
                <td className="px-4 py-3 text-petrol-60">{emp.email}</td>
                <td className="px-4 py-3 text-petrol-80">
                  {emp.is_admin ? "Admin" : "Medarbetare"}
                </td>
                <td className="px-4 py-3 text-petrol-60">{emp.site ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-petrol-60">
                  Inga träffar för &quot;{search}&quot;
                  {siteFilter && ` på ${siteFilter}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-petrol-60 mt-3">
        Visar {filtered.length} av {employees.length} medarbetare
      </p>
    </div>
  );
}