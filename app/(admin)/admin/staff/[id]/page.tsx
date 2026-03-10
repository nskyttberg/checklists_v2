"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { useAdminNav } from "@/lib/contexts/admin-nav-context";
import { getInitials } from "@/lib/ui/primitives";
import { formatCompetence } from "@/lib/format";

// =============================================================================
// Types
// =============================================================================

type EmployeeStatus = "active" | "inactive" | "temporary_inactive";
type AppRole = "admin" | "method_responsible" | "manager" | "superadmin";

interface Employee {
  id: string;
  name: string;
  email: string;
  site: string | null;
  status: EmployeeStatus;
  created_at: string;
}

interface EmployeeRole {
  id: string;
  role: AppRole;
  work_task_id: string | null;
  granted_by_id: string | null;
  granted_at: string;
  revoked_at: string | null;
  work_task?: { id: string; name: string } | null;
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
  section_signatures: { signed_by_employee_at: string | null; signed_by_supervisor_at: string | null }[];
}

// =============================================================================
// Constants
// =============================================================================

const ROLE_LABELS: Record<AppRole, string> = {
  admin:              "Administratör",
  method_responsible: "Metodansvarig",
  manager:            "Chef",
  superadmin:         "Superadmin",
};

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; dotClass: string; badgeClass: string }> = {
  active:            { label: "Aktiv",               dotClass: "bg-success",      badgeClass: "bg-[#EAF3EF] text-success" },
  inactive:          { label: "Inaktiv",             dotClass: "bg-error",        badgeClass: "bg-[#FAEDED] text-error" },
  temporary_inactive:{ label: "Tillfälligt inaktiv", dotClass: "bg-[#7B6FAB]",   badgeClass: "bg-[#F0EEF8] text-[#7B6FAB]" },
};

// =============================================================================
// Sub-components
// =============================================================================

function StatusDot({ status }: { status: EmployeeStatus }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${STATUS_CONFIG[status].dotClass}`} />
  );
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.badgeClass}`}>
      <StatusDot status={status} />
      {cfg.label}
    </span>
  );
}

// =============================================================================
// Add Role Dialog
// =============================================================================

interface AddRoleDialogProps {
  existingRoles: EmployeeRole[];
  workTasks: WorkTask[];
  onClose: () => void;
  onAdd: (role: AppRole, workTaskId: string | null) => Promise<void>;
}

const ALL_ROLES: { key: AppRole; label: string; desc: string }[] = [
  { key: "admin",              label: "Administratör",  desc: "Adminvyer, mallar, medarbetarhantering" },
  { key: "method_responsible", label: "Metodansvarig",  desc: "Approver och körkortsåtgärder för sina metoder" },
  { key: "manager",            label: "Chef",           desc: "Approver och körkortsåtgärder för alla metoder" },
  { key: "superadmin",         label: "Superadmin",     desc: "Fullständig access, override-signering, rollhantering" },
];

function AddRoleDialog({ existingRoles, workTasks, onClose, onAdd }: AddRoleDialogProps) {
  const [selectedRole, setSelectedRole]     = useState<AppRole | "">("");
  const [selectedWorkTask, setSelectedWorkTask] = useState("");
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState("");

  // Roles already held (excluding method_responsible which can be held multiple times)
  const heldRoles = new Set(
    existingRoles
      .filter(r => r.role !== "method_responsible")
      .map(r => r.role)
  );
  const availableRoles = ALL_ROLES.filter(r =>
    r.key === "method_responsible" ? true : !heldRoles.has(r.key)
  );

  const needsWorkTask = selectedRole === "method_responsible";
  const canSave = selectedRole && (!needsWorkTask || selectedWorkTask);

  async function handleSave() {
    if (!canSave || !selectedRole) return;
    setSaving(true);
    setError("");
    try {
      await onAdd(selectedRole, needsWorkTask ? selectedWorkTask : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Något gick fel.");
      setSaving(false);
    }
  }

  const groupedWorkTasks = workTasks.reduce<Record<string, WorkTask[]>>((acc, wt) => {
    const key = wt.category || "Övrigt";
    if (!acc[key]) acc[key] = [];
    acc[key].push(wt);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/35 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl">
        <h3 className="text-base font-extrabold text-petrol mb-1">Lägg till roll</h3>
        <p className="text-sm text-petrol-60 mb-5">Välj vilken roll medarbetaren ska tilldelas.</p>

        <div className="flex flex-col gap-2 mb-4">
          {availableRoles.map(role => (
            <label
              key={role.key}
              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
                selectedRole === role.key
                  ? "border-petrol bg-petrol-10"
                  : "border-slate bg-white hover:bg-cream"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role.key}
                checked={selectedRole === role.key}
                onChange={() => { setSelectedRole(role.key as AppRole); setSelectedWorkTask(""); }}
                className="mt-0.5 accent-petrol"
              />
              <div>
                <div className="text-sm font-bold text-petrol">{role.label}</div>
                <div className="text-xs text-petrol-60 mt-0.5">{role.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {needsWorkTask && (
          <div className="mb-4">
            <label className="text-xs font-bold text-petrol-60 uppercase tracking-wide block mb-1.5">
              Metod
            </label>
            <select
              value={selectedWorkTask}
              onChange={e => setSelectedWorkTask(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm text-petrol bg-white outline-none transition-colors ${
                selectedWorkTask ? "border-petrol" : "border-slate"
              }`}
            >
              <option value="">Välj metod...</option>
              {Object.entries(groupedWorkTasks).map(([cat, tasks]) => (
                <optgroup key={cat} label={cat}>
                  {tasks.map(wt => (
                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p className="text-sm text-error bg-[#FAEDED] rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-3xl border border-slate bg-white text-petrol text-sm font-semibold hover:bg-cream transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-3xl bg-accent text-white text-sm font-semibold hover:bg-accent-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Sparar..." : "Lägg till"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main page
// =============================================================================

export default function StaffDetailPage() {
  const { id: employeeId }              = useParams<{ id: string }>();
  const { currentUser }                 = useUser();
  const { setTopbarContext }            = useAdminNav();

  const [employee, setEmployee]         = useState<Employee | null>(null);
  const [roles, setRoles]               = useState<EmployeeRole[]>([]);
  const [instances, setInstances]       = useState<InstanceRow[]>([]);
  const [workTasks, setWorkTasks]       = useState<WorkTask[]>([]);
  const [competenceDefs, setCompetenceDefs] = useState<CompetenceDefinition[]>([]);

  const [loading, setLoading]           = useState(true);
  const [showAddRole, setShowAddRole]   = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  // Assign checklist modal state
  const [showAssignModal, setShowAssignModal]         = useState(false);
  const [selectedWorkTask, setSelectedWorkTask]       = useState("");
  const [selectedCompetence, setSelectedCompetence]  = useState("");
  const [assigning, setAssigning]                     = useState(false);
  const [assignError, setAssignError]                 = useState("");

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    // Employee
    const { data: emp, error: empErr } = await supabase
      .from("employee")
      .select("id, name, email, site, status, created_at")
      .eq("id", employeeId)
      .single();

    if (empErr) { console.error("Failed to fetch employee:", empErr.message); setLoading(false); return; }
    setEmployee(emp as Employee);

    // Active roles
    const { data: roleData } = await supabase
      .from("employee_role")
      .select("id, role, work_task_id, granted_by_id, granted_at, revoked_at, work_task:work_task_id(id, name)")
      .eq("employee_id", employeeId)
      .is("revoked_at", null)
      .order("granted_at");
    setRoles((roleData as unknown as EmployeeRole[]) || []);

    // Work tasks (needed for both AddRoleDialog and AssignModal)
    const { data: wt } = await supabase
      .from("work_task")
      .select("id, name, type, category")
      .eq("active", true)
      .order("category")
      .order("name");
    if (wt) setWorkTasks(wt);

    // Competence definitions (needed for AssignModal)
    const { data: cd } = await supabase
      .from("competence_definition")
      .select("id, display_name, competence_type, level, work_task_id");
    if (cd) setCompetenceDefs(cd);

    // Checklist instances
    const { data: inst } = await supabase
      .from("checklist_instance")
      .select(`
        id, status, assigned_at, completed_at,
        checklist_template:template_id ( id, name, version ),
        competence_definition:competence_definition_id (
          id, display_name, competence_type, level,
          work_task:work_task_id ( id, name )
        ),
        section_signatures ( signed_by_employee_at, signed_by_supervisor_at )
      `)
      .eq("employee_id", employeeId)
      .order("assigned_at", { ascending: false });
    setInstances((inst as unknown as InstanceRow[]) || []);

    setLoading(false);
  }, [employeeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // -------------------------------------------------------------------------
  // Topbar
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!employee) return;
    const activeCount = instances.filter(i => i.status === "active").length;
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

  // -------------------------------------------------------------------------
  // Status change
  // -------------------------------------------------------------------------

  async function handleStatusChange(newStatus: EmployeeStatus) {
    if (!employee || newStatus === employee.status) { setShowStatusMenu(false); return; }
    setStatusSaving(true);
    setShowStatusMenu(false);
    const { error } = await supabase
      .from("employee")
      .update({ status: newStatus })
      .eq("id", employeeId);
    if (!error) setEmployee(prev => prev ? { ...prev, status: newStatus } : prev);
    setStatusSaving(false);
  }

  // -------------------------------------------------------------------------
  // Role management
  // -------------------------------------------------------------------------

  async function handleAddRole(role: AppRole, workTaskId: string | null) {
    const { error } = await supabase
      .from("employee_role")
      .insert({
        employee_id:   employeeId,
        role,
        work_task_id:  workTaskId,
        granted_by_id: currentUser?.id ?? null,
        granted_at:    new Date().toISOString().slice(0, 10),
      });
    if (error) throw new Error(error.message);
    setShowAddRole(false);
    await fetchData();
  }

  async function handleRevokeRole(roleId: string) {
    const { error } = await supabase
      .from("employee_role")
      .update({ revoked_at: new Date().toISOString().slice(0, 10) })
      .eq("id", roleId);
    if (!error) await fetchData();
  }

  // -------------------------------------------------------------------------
  // Assign checklist (unchanged logic, updated modal UI below)
  // -------------------------------------------------------------------------

  function openAssignModal() {
    setShowAssignModal(true);
    setSelectedWorkTask("");
    setSelectedCompetence("");
    setAssignError("");
  }

  const filteredCompetences = competenceDefs
    .filter(cd => cd.work_task_id === selectedWorkTask)
    .sort((a, b) => a.level - b.level);

  const groupedWorkTasks = workTasks.reduce<Record<string, WorkTask[]>>((acc, wt) => {
    const key = wt.category || "Övrigt";
    if (!acc[key]) acc[key] = [];
    acc[key].push(wt);
    return acc;
  }, {});

  async function handleAssign() {
    if (!selectedCompetence) return;
    setAssigning(true);
    setAssignError("");
    const { data: existing } = await supabase
      .from("checklist_instance")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("competence_definition_id", selectedCompetence)
      .eq("status", "active")
      .maybeSingle();
    if (existing) { setAssignError("Medarbetaren har redan en aktiv checklista för denna behörighet."); setAssigning(false); return; }
    const { error: assignErr } = await supabase.rpc("assign_checklist", {
      p_employee_id:              employeeId,
      p_competence_definition_id: selectedCompetence,
      p_assigned_by_id:           currentUser?.id ?? null,
    });
    if (assignErr) {
      let msg = assignErr.message;
      if (msg.includes("No published template")) msg = "Ingen publicerad mall hittades för denna behörighet.";
      if (msg.includes("already has an active checklist")) msg = "Medarbetaren har redan en aktiv checklista för denna behörighet.";
      setAssignError(msg);
      setAssigning(false);
      return;
    }
    setShowAssignModal(false);
    await fetchData();
    setAssigning(false);
  }

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const approverScope = (() => {
    if (roles.some(r => ["manager", "superadmin"].includes(r.role))) return "Alla metoder";
    const methodRoles = roles.filter(r => r.role === "method_responsible");
    if (methodRoles.length === 0) return null;
    return methodRoles.map(r => (r.work_task as { name: string } | null)?.name ?? r.work_task_id).join(", ");
  })();

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-petrol-60 text-sm">Laddar...</div>;
  }

  if (!employee) {
    return (
      <div className="text-center py-20">
        <p className="text-petrol font-bold mb-2">Medarbetaren hittades inte</p>
        <Link href="/admin/staff" className="text-sm text-petrol-60 hover:text-petrol underline">← Tillbaka till medarbetare</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[employee.status];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-full bg-petrol text-white flex items-center justify-center text-lg font-extrabold select-none flex-shrink-0">
            {getInitials(employee.name)}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-petrol leading-tight">{employee.name}</h1>
            <div className="flex items-center gap-3 text-sm text-petrol-60 mt-0.5">
              <span>{employee.email}</span>
              {employee.site && <><span className="text-slate">·</span><span>{employee.site}</span></>}
            </div>
          </div>
        </div>

        {/* Status dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowStatusMenu(v => !v)}
            disabled={statusSaving}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border-2 text-xs font-bold transition-opacity cursor-pointer ${statusCfg.badgeClass} ${statusSaving ? "opacity-60" : ""}`}
            style={{ borderColor: "currentColor" }}
          >
            <StatusDot status={employee.status} />
            {statusSaving ? "Sparar..." : statusCfg.label}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {showStatusMenu && (
            <div className="absolute right-0 top-[calc(100%+6px)] bg-white rounded-xl border border-slate shadow-lg z-40 min-w-[200px] overflow-hidden">
              {(Object.entries(STATUS_CONFIG) as [EmployeeStatus, typeof STATUS_CONFIG[EmployeeStatus]][]).map(([key, cfg], idx, arr) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-cream ${employee.status === key ? "font-bold bg-cream" : "font-normal bg-white"} ${idx < arr.length - 1 ? "border-b border-slate" : ""}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
                  {cfg.label}
                  {employee.status === key && (
                    <svg className="ml-auto" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#4F866E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Info + Roles */}
      <div className="grid grid-cols-2 gap-5">

        {/* Grundinformation */}
        <div className="bg-white rounded-2xl border border-slate p-6">
          <h2 className="text-xs font-bold text-petrol-60 uppercase tracking-widest mb-4">Grundinformation</h2>
          <dl className="divide-y divide-slate">
            {[
              ["Namn",     employee.name],
              ["E-post",   employee.email],
              ["Enhet",    employee.site ?? "—"],
              ["Tillagd",  employee.created_at?.slice(0, 10) ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-petrol-60">{label}</dt>
                <dd className="text-sm font-semibold text-petrol">{value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-petrol-60">Status</dt>
              <dd><StatusBadge status={employee.status} /></dd>
            </div>
          </dl>
        </div>

        {/* Roller */}
        <div className="bg-white rounded-2xl border border-slate p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-petrol-60 uppercase tracking-widest">Roller</h2>
            <button
              onClick={() => setShowAddRole(true)}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-4 rounded-3xl bg-accent text-white text-xs font-bold hover:bg-accent-80 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Lägg till roll
            </button>
          </div>

          {roles.length === 0 ? (
            <p className="text-sm text-petrol-60 text-center py-6">Inga roller tilldelade</p>
          ) : (
            <div className="flex flex-col gap-2">
              {roles.map(r => (
                <div key={r.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-cream border border-slate">
                  <div>
                    <div className="text-sm font-bold text-petrol">{ROLE_LABELS[r.role]}</div>
                    {r.work_task && (
                      <div className="text-xs text-petrol-60 mt-0.5">
                        {(r.work_task as { name: string }).name}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevokeRole(r.id)}
                    title="Ta bort roll"
                    className="flex items-center justify-center w-7 h-7 rounded-full border border-slate bg-white text-petrol-60 hover:text-error hover:border-error transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {approverScope && (
            <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-petrol-10 border border-petrol-20 text-xs text-petrol-80">
              <strong>Approver-behörighet:</strong> {approverScope}
            </div>
          )}
        </div>
      </div>

      {/* Tilldelade checklistor */}
      <div className="bg-white rounded-2xl border border-slate p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-petrol-60 uppercase tracking-widest">Tilldelade checklistor</h2>
          <button
            onClick={openAssignModal}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-4 rounded-3xl border border-slate bg-white text-petrol text-xs font-semibold hover:bg-cream transition-colors"
          >
            + Tilldela checklista
          </button>
        </div>

        {instances.length === 0 ? (
          <p className="text-sm text-petrol-60 text-center py-8">Inga checklistor tilldelade ännu.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-cream">
                {["Metod", "Behörighet", "Mall", "Tilldelad", "Framsteg", "Status"].map(h => (
                  <th key={h} className="px-3 py-2 text-[11px] font-bold text-petrol-60 uppercase tracking-wide border-b border-slate">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instances.map(inst => {
                const sigs = inst.section_signatures ?? [];
                const total = sigs.length;
                const done  = sigs.filter(s => s.signed_by_employee_at && s.signed_by_supervisor_at).length;
                const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                const isCompleted = inst.status === "completed";
                return (
                  <tr key={inst.id} className="border-b border-slate last:border-0">
                    <td className="px-3 py-3 text-sm font-semibold text-petrol">
                      {inst.competence_definition.work_task?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-sm text-petrol">
                      {formatCompetence(inst.competence_definition)}
                    </td>
                    <td className="px-3 py-3 text-sm text-petrol-60">
                      {inst.checklist_template.name} v{inst.checklist_template.version}
                    </td>
                    <td className="px-3 py-3 text-sm text-petrol-60">
                      {inst.assigned_at.slice(0, 10)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-14 bg-petrol-20 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isCompleted ? "bg-success" : "bg-accent"}`}
                            style={{ width: `${isCompleted ? 100 : pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-petrol-60">{done}/{total}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isCompleted
                          ? "bg-[#EAF3EF] text-success"
                          : "bg-[#FDF3E3] text-warning"
                      }`}>
                        {isCompleted ? "Slutförd" : "Pågående"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Role Dialog */}
      {showAddRole && (
        <AddRoleDialog
          existingRoles={roles}
          workTasks={workTasks.length > 0 ? workTasks : []}
          onClose={() => setShowAddRole(false)}
          onAdd={handleAddRole}
        />
      )}

      {/* Assign Checklist Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/35 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-extrabold text-petrol mb-1">Tilldela checklista</h3>
            <p className="text-sm text-petrol-60 mb-5">
              Välj metod och behörighet. Systemet hittar rätt publicerad mall automatiskt.
            </p>

            <div className="mb-4">
              <label className="text-xs font-bold text-petrol-60 uppercase tracking-wide block mb-1.5">Metod</label>
              <select
                value={selectedWorkTask}
                onChange={e => { setSelectedWorkTask(e.target.value); setSelectedCompetence(""); }}
                className="w-full px-3 py-2.5 rounded-lg border border-slate text-sm text-petrol bg-white outline-none focus:border-petrol transition-colors"
              >
                <option value="">Välj metod...</option>
                {Object.entries(groupedWorkTasks).map(([cat, tasks]) => (
                  <optgroup key={cat} label={cat}>
                    {tasks.map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            {selectedWorkTask && (
              <div className="mb-4">
                <label className="text-xs font-bold text-petrol-60 uppercase tracking-wide block mb-1.5">Behörighet</label>
                <select
                  value={selectedCompetence}
                  onChange={e => setSelectedCompetence(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate text-sm text-petrol bg-white outline-none focus:border-petrol transition-colors"
                >
                  <option value="">Välj behörighet...</option>
                  {filteredCompetences.map(cd => (
                    <option key={cd.id} value={cd.id}>{cd.display_name}</option>
                  ))}
                </select>
              </div>
            )}

            {assignError && (
              <p className="text-sm text-error bg-[#FAEDED] rounded-lg px-3 py-2 mb-4">{assignError}</p>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-3xl border border-slate bg-white text-petrol text-sm font-semibold hover:bg-cream transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedCompetence || assigning}
                className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-3xl bg-accent text-white text-sm font-semibold hover:bg-accent-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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