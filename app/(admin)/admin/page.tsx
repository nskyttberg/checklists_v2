"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatCompetenceShort, formatDate } from "@/lib/format";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface SectionSig {
  signed_by_trainee_at: string | null;
  signed_by_supervisor_at: string | null;
}

interface InstanceRow {
  id: string;
  status: string;
  assigned_at: string;
  employee: { id: string; name: string; site: string | null };
  competence_definition: {
    id: string;
    display_name: string;
    competence_type: string;
    level: number;
    work_task: { id: string; name: string; category: string | null };
  };
  section_signature: SectionSig[];
}

// -------------------------------------------------
// Helpers
// -------------------------------------------------

function ProgressCell({ signatures }: { signatures: SectionSig[] }) {
  const total  = signatures.length;
  const signed = signatures.filter(
    (s) => s.signed_by_trainee_at !== null && s.signed_by_supervisor_at !== null,
  ).length;

  if (total === 0) return <span className="text-petrol-40 text-xs">—</span>;

  const pct      = (signed / total) * 100;
  const complete = signed === total;

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 99,
          backgroundColor: "var(--color-slate)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            backgroundColor: complete ? "var(--color-success)" : "var(--color-petrol)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color: complete ? "var(--color-success)" : "var(--color-petrol-60)" }}
      >
        {signed}/{total}
      </span>
    </div>
  );
}

// -------------------------------------------------
// Page
// -------------------------------------------------

export default function AdminOverview() {
  const router = useRouter();
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("");

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
          competence_definition:competence_definition_id (
            id,
            display_name,
            competence_type,
            level,
            work_task:work_task_id ( id, name, category )
          ),
          section_signature ( signed_by_trainee_at, signed_by_supervisor_at )
        `,
        )
        .eq("status", "active")
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
      inst.competence_definition?.work_task?.name?.toLowerCase().includes(lowerFilter)
    );
  });

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Laddar...</p>
      </div>
    );
  }

  if (instances.length === 0) {
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
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Tilldelad</th>
              <th className="text-left px-4 py-3 font-medium text-petrol-80">Framsteg</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inst) => (
              <tr
                key={inst.id}
                onClick={() => router.push(`/admin/staff/${inst.employee?.id}`)}
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
                  {formatCompetenceShort(
                    inst.competence_definition?.level,
                    inst.competence_definition?.competence_type,
                  )}
                </td>
                <td className="px-4 py-3 text-petrol-60">
                  {formatDate(inst.assigned_at)}
                </td>
                <td className="px-4 py-3">
                  <ProgressCell signatures={inst.section_signature ?? []} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-petrol-60">
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