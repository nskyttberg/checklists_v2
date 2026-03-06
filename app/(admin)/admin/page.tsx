"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface InstanceRow {
  id: string;
  status: string;
  assigned_at: string;
  employee: { id: string; name: string; site: string | null };
  checklist_template: { id: string; name: string; version: number };
  competence_definition: {
    id: string;
    display_name: string;
    competence_type: string;
    level: number;
    work_task: { id: string; name: string; category: string | null };
  };
}

// -------------------------------------------------
// Helpers
// -------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

function competenceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    examination:     "Undersökning",
    reporting:       "Svar",
    referral_review: "Remissgranskning",
    delegation:      "Delegering",
    remote_work:     "Distansarbete",
  };
  return map[type] || type;
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active:    "bg-warning-light text-warning",
    completed: "bg-success-light text-success",
    cancelled: "bg-petrol-20 text-petrol-60",
  };
  const labels: Record<string, string> = {
    active:    "Pågående",
    completed: "Klar",
    cancelled: "Avbruten",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || "bg-petrol-20 text-petrol"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

// -------------------------------------------------
// Page
// -------------------------------------------------

export default function AdminOverview() {
  const { currentUser } = useUser();
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function fetchInstances() {
      const { data, error } = await supabase
        .from("checklist_instance")
        .select(
          `
          id,
          status,
          assigned_at,
          employee:employee_id ( id, name, site ),
          checklist_template:template_id ( id, name, version ),
          competence_definition:competence_definition_id (
            id,
            display_name,
            competence_type,
            level,
            work_task:work_task_id ( id, name, category )
          )
        `
        )
        .order("assigned_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch instances:", error.message);
      } else {
        setInstances((data as unknown as InstanceRow[]) || []);
      }
      setLoading(false);
    }

    fetchInstances();
  }, []);

  const lowerFilter = filter.toLowerCase();
  const filtered = instances.filter((inst) => {
    if (!lowerFilter) return true;
    return (
      inst.employee?.name?.toLowerCase().includes(lowerFilter) ||
      inst.competence_definition?.work_task?.name?.toLowerCase().includes(lowerFilter) ||
      inst.checklist_template?.name?.toLowerCase().includes(lowerFilter)
    );
  });

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Laddar...</p>
      </div>
    );
  }

  if (!loading && instances.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-white rounded-xl border border-slate p-10 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-petrol">Inga pågående upplärningar</h1>
          <p className="text-petrol-60 mt-2 mb-6">
            Tilldela en checklista till en medarbetare för att komma igång.
          </p>
          <Link
            href="/admin/staff"
            className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors"
          >
            Gå till medarbetare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-petrol">Pågående upplärningar</h1>
        <input
          type="text"
          placeholder="Filtrera på namn eller metod..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-slate rounded-lg bg-white text-petrol placeholder-petrol-60 focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm w-64"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate bg-cream">
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Medarbetare</th>
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Metod</th>
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Behörighet</th>
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Mall</th>
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Tilldelad</th>
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inst) => (
              <tr
                key={inst.id}
                className="border-b border-slate/50 hover:bg-cream transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-petrol font-medium">
                  {inst.employee?.name}
                  {inst.employee?.site && (
                    <span className="text-petrol-60 font-normal ml-1 text-xs">
                      {inst.employee.site}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-petrol-80">
                  {inst.competence_definition?.work_task?.name}
                </td>
                <td className="px-4 py-3 text-petrol-80">
                  <span className="text-petrol-60 text-xs">
                    {competenceTypeLabel(inst.competence_definition?.competence_type)}
                    {" · "}
                  </span>
                  {inst.competence_definition?.display_name}
                </td>
                <td className="px-4 py-3 text-petrol-60">
                  {inst.checklist_template?.name}
                  <span className="ml-1 text-xs bg-petrol-20 text-petrol rounded-full px-1.5 py-0.5">
                    v{inst.checklist_template?.version}
                  </span>
                </td>
                <td className="px-4 py-3 text-petrol-60">
                  {formatDate(inst.assigned_at)}
                </td>
                <td className="px-4 py-3">{statusBadge(inst.status)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-petrol-60">
                  Inga träffar för &quot;{filter}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}