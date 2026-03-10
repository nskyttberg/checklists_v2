"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EmployeeStatus = "active" | "inactive" | "temporary_inactive";

interface Employee {
  id: string;
  name: string;
  email: string;
  site: string | null;
  status: EmployeeStatus;
}

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  active:            "Aktiv",
  inactive:          "Inaktiv",
  temporary_inactive:"Tillfälligt inaktiv",
};

export default function StaffPage() {
  const router = useRouter();
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [siteFilter, setSiteFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "">("");

  useEffect(() => {
    async function fetchEmployees() {
      const { data, error } = await supabase
        .from("employee")
        .select("id, name, email, site, status")
        .order("name");
      if (error) console.error("Failed to fetch employees:", error.message);
      else setEmployees(data || []);
      setLoading(false);
    }
    fetchEmployees();
  }, []);

  const sites = Array.from(new Set(employees.map(e => e.site).filter(Boolean))).sort() as string[];

  const lower = search.toLowerCase();
  const filtered = employees.filter(emp => {
    const matchSearch = !lower || emp.name.toLowerCase().includes(lower) || emp.email.toLowerCase().includes(lower);
    const matchSite   = !siteFilter || emp.site === siteFilter;
    const matchStatus = !statusFilter || emp.status === statusFilter;
    return matchSearch && matchSite && matchStatus;
  });

  if (loading) {
    return <div className="text-center py-16 text-petrol-60 text-sm">Laddar...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold text-petrol">Medarbetare</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Sök namn eller e-post..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate bg-white text-sm text-petrol placeholder-petrol-40 outline-none focus:border-petrol transition-colors"
        />
        <select
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate bg-white text-sm text-petrol outline-none focus:border-petrol transition-colors"
        >
          <option value="">Alla enheter</option>
          {sites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as EmployeeStatus | "")}
          className="px-3 py-2 rounded-lg border border-slate bg-white text-sm text-petrol outline-none focus:border-petrol transition-colors"
        >
          <option value="">Alla statusar</option>
          {(Object.entries(STATUS_LABELS) as [EmployeeStatus, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cream">
              {["Namn", "E-post", "Enhet", "Status"].map(h => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-petrol-60 uppercase tracking-wide border-b border-slate">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => (
              <tr
                key={emp.id}
                onClick={() => router.push(`/admin/staff/${emp.id}`)}
                className="border-b border-slate last:border-0 cursor-pointer hover:bg-cream transition-colors"
              >
                <td className="px-4 py-3 text-sm font-semibold text-petrol">{emp.name}</td>
                <td className="px-4 py-3 text-sm text-petrol-60">{emp.email}</td>
                <td className="px-4 py-3 text-sm text-petrol-60">{emp.site ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    emp.status === "active"
                      ? "bg-[#EAF3EF] text-[#4F866E]"
                      : emp.status === "temporary_inactive"
                      ? "bg-[#F0EEF8] text-[#7B6FAB]"
                      : "bg-[#FAEDED] text-[#C25450]"
                  }`}>
                    {STATUS_LABELS[emp.status]}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-petrol-60">
                  Inga träffar{search && ` för "${search}"`}{siteFilter && ` på ${siteFilter}`}
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