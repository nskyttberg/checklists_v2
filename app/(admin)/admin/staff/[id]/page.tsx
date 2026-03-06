"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { useAdminNav } from "@/lib/contexts/admin-nav-context";
import { getInitials } from "@/lib/ui/primitives";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface Employee {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  site: string | null;
}

interface WorkTask {
  id: string;
  name: string;
  type: string;
  category: string | null;
}

interface CompetenceDefinition {
  id: string;
  display_name: string;
  competence_type: string;
  level: number;
  work_task_id: string;
}

interface InstanceRow {
  id: string;
  status: string;
  assigned_at: string;
  completed_at: string | null;
  checklist_template: { id: string; name: string; version: number };
  competence_definition: {
    id: string;
    display_name: string;
    competence_type: string;
    level: number;
    work_task: { id: string; name: string };
  };
  assigned_by: { id: string; name: string } | null;
}

// -------------------------------------------------
// Helpers
// -------------------------------------------------

const COMPETENCE_TYPE_LABELS: Record<string, string> = {
  examination:     "Undersökning",
  reporting:       "Svar",
  referral_review: "Remissgranskning",
  delegation:      "Delegering",
  remote_work:     "Distansarbete",
};

function competenceTypeLabel(type: string): string {
  return COMPETENCE_TYPE_LABELS[type] || type;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sv-SE");
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-petrol-20 text-petrol"}`}>
      {labels[status] || status}
    </span>
  );
}

// -------------------------------------------------
// Page
// -------------------------------------------------

export default function StaffDetailPage() {
  const params = useParams();
  const employeeId = params.id as string;
  const { currentUser } = useUser();
  const { setTopbarContext } = useAdminNav();

  const [employee, setEmployee]   = useState<Employee | null>(null);
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading]     = useState(true);

  // Modal state
  const [showModal, setShowModal]                   = useState(false);
  const [workTasks, setWorkTasks]                   = useState<WorkTask[]>([]);
  const [competenceDefs, setCompetenceDefs]         = useState<CompetenceDefinition[]>([]);
  const [selectedWorkTask, setSelectedWorkTask]     = useState("");
  const [selectedCompetence, setSelectedCompetence] = useState("");
  const [assigning, setAssigning]                   = useState(false);
  const [assignError, setAssignError]               = useState("");

  // -------------------------------------------------
  // Fetch employee + instances
  // -------------------------------------------------

  const fetchData = useCallback(async () => {
    const { data: emp, error: empErr } = await supabase
      .from("employee")
      .select("id, name, email, is_admin, site")
      .eq("id", employeeId)
      .single();

    if (empErr) {
      console.error("Failed to fetch employee:", empErr.message);
      setLoading(false);
      return;
    }
    setEmployee(emp);

    const { data: inst, error: instErr } = await supabase
      .from("checklist_instance")
      .select(`
        id, status, assigned_at, completed_at,
        checklist_template:template_id ( id, name, version ),
        competence_definition:competence_definition_id (
          id, display_name, competence_type, level,
          work_task:work_task_id ( id, name )
        ),
        assigned_by:assigned_by_id ( id, name )
      `)
      .eq("employee_id", employeeId)
      .order("assigned_at", { ascending: false });

    if (!instErr) setInstances((inst as unknown as InstanceRow[]) || []);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // -------------------------------------------------
  // Topbar
  // -------------------------------------------------

  useEffect(() => {
    if (!employee) return;
    const activeCount = instances.filter((i) => i.status === "active").length;
    setTopbarContext({
      type: "staff",
      name: employee.name,
      meta: employee.site ?? "",
      initials: getInitials(employee.name),
      badge: activeCount > 0
        ? `${activeCount} aktiv${activeCount === 1 ? "" : "a"} upplärning${activeCount === 1 ? "" : "ar"}`
        : undefined,
      badgeVariant: "active",
      backLabel: "Medarbetare",
      backHref: "/admin/staff",
    });
    return () => setTopbarContext(null);
  }, [employee, instances, setTopbarContext]);

  // -------------------------------------------------
  // Open assign modal
  // -------------------------------------------------

  async function openAssignModal() {
    setShowModal(true);
    setSelectedWorkTask("");
    setSelectedCompetence("");
    setAssignError("");

    const { data: wt } = await supabase
      .from("work_task")
      .select("id, name, type, category")
      .eq("active", true)
      .order("category")
      .order("name");
    if (wt) setWorkTasks(wt);

    const { data: cd } = await supabase
      .from("competence_definition")
      .select("id, display_name, competence_type, level, work_task_id");
    if (cd) setCompetenceDefs(cd);
  }

  const filteredCompetences = competenceDefs
    .filter((cd) => cd.work_task_id === selectedWorkTask)
    .sort((a, b) => a.level - b.level);

  const groupedWorkTasks = workTasks.reduce<Record<string, WorkTask[]>>((acc, wt) => {
    const key = wt.category || "Övrigt";
    if (!acc[key]) acc[key] = [];
    acc[key].push(wt);
    return acc;
  }, {});

  // -------------------------------------------------
  // Assign checklist
  // schema v3: assign_checklist(p_employee_id, p_competence_definition_id, p_assigned_by_id)
  // The RPC finds the correct published template internally — no p_template_id needed.
  // -------------------------------------------------

  async function handleAssign() {
    if (!selectedCompetence) return;
    setAssigning(true);
    setAssignError("");

    // Pre-check: existing active instance gives a cleaner UX error than the RPC exception
    const { data: existing } = await supabase
      .from("checklist_instance")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("competence_definition_id", selectedCompetence)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      setAssignError("Medarbetaren har redan en aktiv checklista för denna behörighet.");
      setAssigning(false);
      return;
    }

    const { error: assignErr } = await supabase.rpc("assign_checklist", {
      p_employee_id:              employeeId,
      p_competence_definition_id: selectedCompetence,
      p_assigned_by_id:           currentUser?.id ?? null,
    });

    if (assignErr) {
      // Map RPC exception messages to Swedish
      let msg = assignErr.message;
      if (msg.includes("No published template"))
        msg = "Ingen publicerad mall hittades för denna behörighet. Skapa och publicera en mall först.";
      if (msg.includes("already has an active checklist"))
        msg = "Medarbetaren har redan en aktiv checklista för denna behörighet.";
      setAssignError(msg);
      setAssigning(false);
      return;
    }

    setShowModal(false);
    setAssigning(false);
    await fetchData();
  }

  // -------------------------------------------------
  // Loading / not found
  // -------------------------------------------------

  if (loading) {
    return <div className="text-center py-16"><p className="text-petrol-60">Laddar...</p></div>;
  }

  if (!employee) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Medarbetaren hittades inte.</p>
        <Link href="/admin/staff" className="text-petrol-80 hover:text-petrol mt-2 inline-block">
          Tillbaka till medarbetare
        </Link>
      </div>
    );
  }

  // -------------------------------------------------
  // Render
  // -------------------------------------------------

  return (
    <div>
      {/* Employee info card */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-petrol-20 text-petrol flex items-center justify-center text-base font-bold flex-shrink-0 select-none">
              {getInitials(employee.name)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-petrol">{employee.name}</h1>
                {employee.is_admin && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-petrol-20 text-petrol">
                    Administratör
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-petrol-60">
                <span>{employee.email}</span>
                {employee.site && <span>{employee.site}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={openAssignModal}
            className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors shrink-0 ml-4"
          >
            Tilldela checklista
          </button>
        </div>
      </div>

      {/* Checklist instances */}
      <h2 className="text-base font-bold text-petrol mb-3">Tilldelade checklistor</h2>

      {instances.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate p-8 text-center">
          <p className="text-petrol-60">
            Inga checklistor tilldelade ännu. Klicka &quot;Tilldela checklista&quot; ovan.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate bg-cream">
                <th className="text-left px-4 py-3 font-medium text-petrol-80">Metod</th>
                <th className="text-left px-4 py-3 font-medium text-petrol-80">Behörighet</th>
                <th className="text-left px-4 py-3 font-medium text-petrol-80">Mall</th>
                <th className="text-left px-4 py-3 font-medium text-petrol-80">Tilldelad</th>
                <th className="text-left px-4 py-3 font-medium text-petrol-80">Status</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((inst) => (
                <tr key={inst.id} className="border-b border-slate/50">
                  <td className="px-4 py-3 text-petrol font-medium">
                    {inst.competence_definition?.work_task?.name}
                  </td>
                  <td className="px-4 py-3 text-petrol-80">
                    <span className="text-petrol-60 text-xs">
                      {competenceTypeLabel(inst.competence_definition?.competence_type)} ·{" "}
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
                    {inst.assigned_by && (
                      <span className="block text-xs text-petrol-40">av {inst.assigned_by.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(inst.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-petrol/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-petrol mb-1">Tilldela checklista</h2>
            <p className="text-sm text-petrol-60 mb-5">
              Välj metod och behörighet — systemet hittar rätt mall automatiskt.
            </p>

            <label className="block text-sm font-medium text-petrol mb-1">Metod</label>
            <select
              value={selectedWorkTask}
              onChange={(e) => { setSelectedWorkTask(e.target.value); setSelectedCompetence(""); setAssignError(""); }}
              className="w-full border border-slate rounded-lg bg-white text-petrol px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="">Välj metod...</option>
              {Object.entries(groupedWorkTasks).map(([category, tasks]) => (
                <optgroup key={category} label={category}>
                  {tasks.map((wt) => (
                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <label className="block text-sm font-medium text-petrol mb-1">Behörighet</label>
            <select
              value={selectedCompetence}
              onChange={(e) => { setSelectedCompetence(e.target.value); setAssignError(""); }}
              disabled={!selectedWorkTask || filteredCompetences.length === 0}
              className="w-full border border-slate rounded-lg bg-white text-petrol px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:bg-cream"
            >
              <option value="">
                {!selectedWorkTask ? "Välj metod först" : "Välj behörighet..."}
              </option>
              {filteredCompetences.map((cd) => (
                <option key={cd.id} value={cd.id}>
                  {competenceTypeLabel(cd.competence_type)} · {cd.display_name}
                </option>
              ))}
            </select>

            {assignError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
                {assignError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowModal(false)}
                className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-5 text-sm font-medium transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedCompetence || assigning}
                className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {assigning ? "Tilldelar..." : "Tilldela"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}