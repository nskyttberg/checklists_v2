"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
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

function competenceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    examination: "UndersÃ¶kning",
    reporting: "Svar",
    referral_review: "Remissgranskning",
    delegation: "Delegering",
    remote_work: "Distansarbete",
  };
  return map[type] || type;
}

function formatDate(iso: string | null) {
  if (!iso) return "â€”";
  return new Date(iso).toLocaleDateString("sv-SE");
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: "bg-warning-light text-warning",
    completed: "bg-success-light text-success",
    cancelled: "bg-petrol-20 text-petrol-60",
  };
  const labels: Record<string, string> = {
    active: "PÃ¥gÃ¥ende",
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

export default function StaffDetailPage() {
  const params = useParams();
  const employeeId = params.id as string;
  const { currentUser } = useUser();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([]);
  const [competenceDefs, setCompetenceDefs] = useState<CompetenceDefinition[]>([]);
  const [selectedWorkTask, setSelectedWorkTask] = useState("");
  const [selectedCompetence, setSelectedCompetence] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  // -------------------------------------------------
  // Fetch employee + instances
  // -------------------------------------------------

  const fetchData = useCallback(async () => {
    // Employee
    const { data: emp, error: empErr } = await supabase
      .from("employee")
      .select("id, name, email, role, site")
      .eq("id", employeeId)
      .single();

    if (empErr) {
      console.error("Failed to fetch employee:", empErr.message);
      setLoading(false);
      return;
    }
    setEmployee(emp);

    // Instances
    const { data: inst, error: instErr } = await supabase
      .from("checklist_instance")
      .select(
        `
        id,
        status,
        assigned_at,
        completed_at,
        checklist_template:template_id ( id, name, version ),
        competence_definition:competence_definition_id (
          id,
          display_name,
          competence_type,
          level,
          work_task:work_task_id ( id, name )
        ),
        assigned_by:assigned_by_id ( id, name )
      `
      )
      .eq("employee_id", employeeId)
      .order("assigned_at", { ascending: false });

    if (!instErr) {
      setInstances((inst as unknown as InstanceRow[]) || []);
    }

    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------
  // Open modal â€” fetch work tasks + competence defs
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

  // Filter competence defs by selected work task
  const filteredCompetences = competenceDefs
    .filter((cd) => cd.work_task_id === selectedWorkTask)
    .sort((a, b) => a.level - b.level);

  // Group work tasks by category
  const groupedWorkTasks = workTasks.reduce<Record<string, WorkTask[]>>(
    (acc, wt) => {
      const key = wt.category || "Ã–vrigt";
      if (!acc[key]) acc[key] = [];
      acc[key].push(wt);
      return acc;
    },
    {}
  );

  // -------------------------------------------------
  // Assign checklist
  // -------------------------------------------------

  async function handleAssign() {
    if (!selectedCompetence) return;
    setAssigning(true);
    setAssignError("");

    // Find a published, active template linked to this competence definition
    const { data: templateLinks, error: linkErr } = await supabase
      .from("checklist_template_competence")
      .select(
        `
        template_id,
        checklist_template:template_id (
          id, status, active
        )
      `
      )
      .eq("competence_definition_id", selectedCompetence);

    if (linkErr) {
      setAssignError(`Kunde inte sÃ¶ka mallar: ${linkErr.message}`);
      setAssigning(false);
      return;
    }

    // Find one that is published + active
    const validLink = (templateLinks as unknown as Array<{
      template_id: string;
      checklist_template: { id: string; status: string; active: boolean };
    }>)?.find(
      (l) =>
        l.checklist_template?.status === "published" &&
        l.checklist_template?.active === true
    );

    if (!validLink) {
      setAssignError(
        "Ingen publicerad checklista hittades fÃ¶r denna behÃ¶righet. Skapa och publicera en mall fÃ¶rst."
      );
      setAssigning(false);
      return;
    }

    // Call assign RPC
    const { error: assignErr } = await supabase.rpc("assign_checklist", {
      p_template_id: validLink.template_id,
      p_employee_id: employeeId,
      p_competence_definition_id: selectedCompetence,
    });

    if (assignErr) {
      // Handle duplicate
      if (assignErr.message.includes("duplicate") || assignErr.message.includes("unique")) {
        setAssignError(
          "Medarbetaren har redan en aktiv checklista fÃ¶r denna behÃ¶righet."
        );
      } else {
        setAssignError(`Tilldelning misslyckades: ${assignErr.message}`);
      }
      setAssigning(false);
      return;
    }

    // Success â€” close modal, refresh data
    setShowModal(false);
    setAssigning(false);
    await fetchData();
  }

  // -------------------------------------------------
  // Loading / not found
  // -------------------------------------------------

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Laddar...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Medarbetaren hittades inte.</p>
        <Link href="/admin/staff" className="text-petrol-80 hover:text-petrol mt-2 inline-block">
          â† Tillbaka till medarbetare
        </Link>
      </div>
    );
  }

  // -------------------------------------------------
  // Render
  // -------------------------------------------------

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/staff"
        className="text-sm text-petrol-80 hover:text-petrol mb-4 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Tillbaka till medarbetare
      </Link>

      {/* Employee info card */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-petrol mb-1">
              {employee.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-petrol-60">
              <span>{employee.email}</span>
              <span className="capitalize">{employee.role}</span>
              {employee.site && <span>{employee.site}</span>}
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

      {/* Assigned checklists */}
      <h2 className="text-base font-bold text-petrol mb-3">
        Tilldelade checklistor
      </h2>

      {instances.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate p-8 text-center">
          <p className="text-petrol-60">
            Inga checklistor tilldelade Ã¤nnu. Klicka &quot;Tilldela checklista&quot; ovan.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate bg-cream">
                <th className="text-left px-4 py-3 font-medium text-petrol-80">Metod</th>
                <th className="text-left px-4 py-3 font-medium text-petrol-80">BehÃ¶righet</th>
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
                      {competenceTypeLabel(inst.competence_definition?.competence_type)}
                      {" Â· "}
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
                      <span className="block text-xs text-petrol-40">
                        av {inst.assigned_by.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(inst.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================ */}
      {/* Assign modal */}
      {/* ============================================ */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-petrol/30"
            onClick={() => setShowModal(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-petrol mb-1">
              Tilldela checklista
            </h2>
            <p className="text-sm text-petrol-60 mb-5">
              VÃ¤lj metod och behÃ¶righet â€” systemet hittar rÃ¤tt mall.
            </p>

            {/* Work task select */}
            <label className="block text-sm font-medium text-petrol mb-1">
              Metod
            </label>
            <select
              value={selectedWorkTask}
              onChange={(e) => {
                setSelectedWorkTask(e.target.value);
                setSelectedCompetence("");
                setAssignError("");
              }}
              className="w-full border border-slate rounded-lg bg-white text-petrol focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm mb-4"
            >
              <option value="">VÃ¤lj metod...</option>
              {Object.entries(groupedWorkTasks).map(([category, tasks]) => (
                <optgroup key={category} label={category}>
                  {tasks.map((wt) => (
                    <option key={wt.id} value={wt.id}>
                      {wt.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Competence definition select */}
            <label className="block text-sm font-medium text-petrol mb-1">
              BehÃ¶righet
            </label>
            <select
              value={selectedCompetence}
              onChange={(e) => {
                setSelectedCompetence(e.target.value);
                setAssignError("");
              }}
              disabled={!selectedWorkTask}
              className="w-full border border-slate rounded-lg bg-white text-petrol focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm mb-4 disabled:opacity-50 disabled:bg-cream"
            >
              <option value="">
                {selectedWorkTask ? "VÃ¤lj behÃ¶righet..." : "VÃ¤lj metod fÃ¶rst"}
              </option>
              {filteredCompetences.map((cd) => (
                <option key={cd.id} value={cd.id}>
                  {competenceTypeLabel(cd.competence_type)} Â· {cd.display_name}
                </option>
              ))}
            </select>

            {/* Error */}
            {assignError && (
              <div className="bg-error-light border border-error/20 rounded-xl text-error text-sm px-4 py-3 mb-4">
                {assignError}
              </div>
            )}

            {/* Actions */}
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

