// lib/queries/checklists.ts
// All Supabase queries related to checklists.
// Returns typed data ready for UI components.
// No business logic here — only data fetching and mutation.

import { supabase } from "@/lib/supabase";

// ─── Shared shape used across all /my/ views ──────────────────────────────

export interface SectionData {
  // From section_signature
  signature_id: string;
  section_id: string;
  signed_by_trainee_id: string | null;
  signed_by_trainee_at: string | null;
  signed_by_supervisor_id: string | null;
  signed_by_supervisor_at: string | null;
  // From template_section
  title: string;
  sort_order: number;
  // From template_item (nested)
  items: { id: string; text: string; sort_order: number }[];
}

export interface MyChecklist {
  // From checklist_instance
  id: string;           // instance id
  status: string;
  assigned_at: string;
  employee_id: string;
  employee_name: string;
  // From checklist_template
  template_name: string;
  template_version: number;
  // From competence_definition
  competence_display_name: string;
  competence_level: number;
  // From work_task
  work_task_id: string;
  work_task_name: string;
  work_task_category: string | null;
  // Sections with signatures
  sections: SectionData[];
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────

// Build sections array from raw Supabase join data
function buildSections(rawSections: any[]): SectionData[] {
  return rawSections
    .sort((a, b) => a.template_section.sort_order - b.template_section.sort_order)
    .map((row) => ({
      signature_id: row.id,
      section_id: row.section_id,
      signed_by_trainee_id: row.signed_by_trainee_id,
      signed_by_trainee_at: row.signed_by_trainee_at,
      signed_by_supervisor_id: row.signed_by_supervisor_id,
      signed_by_supervisor_at: row.signed_by_supervisor_at,
      title: row.template_section.title,
      sort_order: row.template_section.sort_order,
      items: (row.template_section.template_item ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((item: any) => ({
          id: item.id,
          text: item.text,
          sort_order: item.sort_order,
        })),
    }));
}

// Shared instance query — fetches all joins needed for MyChecklist
async function fetchInstances(filter: {
  employee_id?: string;
  status?: string;
}): Promise<MyChecklist[]> {
  let query = supabase
    .from("checklist_instance")
    .select(`
      id,
      status,
      assigned_at,
      employee_id,
      employee:employee_id ( name ),
      checklist_template ( name, version ),
      competence_definition (
        level,
        display_name,
        work_task ( id, name, category )
      ),
      section_signature (
        id,
        section_id,
        signed_by_trainee_id,
        signed_by_trainee_at,
        signed_by_supervisor_id,
        signed_by_supervisor_at,
        template_section (
          title,
          sort_order,
          template_item ( id, text, sort_order )
        )
      )
    `);

  if (filter.employee_id) {
    query = query.eq("employee_id", filter.employee_id);
  }
  if (filter.status) {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetchInstances error:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    status: row.status,
    assigned_at: row.assigned_at,
    employee_id: row.employee_id,
    employee_name: row.employee?.name ?? "",
    template_name: row.checklist_template?.name ?? "",
    template_version: row.checklist_template?.version ?? 1,
    competence_display_name: row.competence_definition?.display_name ?? "",
    competence_level: row.competence_definition?.level ?? 1,
    work_task_id: row.competence_definition?.work_task?.id ?? "",
    work_task_name: row.competence_definition?.work_task?.name ?? "",
    work_task_category: row.competence_definition?.work_task?.category ?? null,
    sections: buildSections(row.section_signature ?? []),
  }));
}

// ─── Public query functions ────────────────────────────────────────────────

// Checklists assigned to this employee (trainee view)
export async function fetchMyChecklists(employeeId: string): Promise<MyChecklist[]> {
  return fetchInstances({ employee_id: employeeId, status: "active" });
}

// Active checklists where current user can counter-sign (supervisor view)
// Fetches all active instances NOT belonging to the user,
// then filters client-side by employee_competence.
// Server-side filtering via can_sign_section() added when RLS is enabled.
export async function fetchSupervisableChecklists(supervisorId: string): Promise<MyChecklist[]> {
  // Get supervisor's competences
  const { data: competences } = await supabase
    .from("employee_competence")
    .select("work_task_id, level")
    .eq("employee_id", supervisorId);

  if (!competences || competences.length === 0) return [];

  // Get all active instances not belonging to this user
  const { data: instances, error } = await supabase
    .from("checklist_instance")
    .select(`
      id,
      status,
      assigned_at,
      employee_id,
      employee:employee_id ( name ),
      checklist_template ( name, version ),
      competence_definition (
        level,
        display_name,
        work_task ( id, name, category )
      ),
      section_signature (
        id,
        section_id,
        signed_by_trainee_id,
        signed_by_trainee_at,
        signed_by_supervisor_id,
        signed_by_supervisor_at,
        template_section (
          title,
          sort_order,
          template_item ( id, text, sort_order )
        )
      )
    `)
    .eq("status", "active")
    .neq("employee_id", supervisorId);

  if (error || !instances) return [];

  // Filter: supervisor must have competence level >= instance level for work_task
  return instances
    .filter((row: any) => {
      const workTaskId = row.competence_definition?.work_task?.id;
      const requiredLevel = row.competence_definition?.level ?? 1;
      return competences.some(
        (c) => c.work_task_id === workTaskId && c.level >= requiredLevel
      );
    })
    .map((row: any) => ({
      id: row.id,
      status: row.status,
      assigned_at: row.assigned_at,
      employee_id: row.employee_id,
      employee_name: row.employee?.name ?? "",
      template_name: row.checklist_template?.name ?? "",
      template_version: row.checklist_template?.version ?? 1,
      competence_display_name: row.competence_definition?.display_name ?? "",
      competence_level: row.competence_definition?.level ?? 1,
      work_task_id: row.competence_definition?.work_task?.id ?? "",
      work_task_name: row.competence_definition?.work_task?.name ?? "",
      work_task_category: row.competence_definition?.work_task?.category ?? null,
      sections: buildSections(row.section_signature ?? []),
    }));
}

// ─── Signing mutations ─────────────────────────────────────────────────────

// Trainee signs a section (calls DB RPC)
export async function signAsTrainee(
  instanceId: string,
  signatureId: string,
  employeeId: string
): Promise<boolean> {
  const { error } = await supabase.rpc("sign_section_as_trainee", {
    p_signature_id: signatureId,
    p_employee_id: employeeId,
  });
  if (error) {
    console.error("signAsTrainee error:", error.message);
    return false;
  }
  return true;
}

// Supervisor counter-signs a section (calls DB RPC)
export async function signAsSupervisor(
  instanceId: string,
  signatureId: string,
  supervisorId: string
): Promise<boolean> {
  const { error } = await supabase.rpc("sign_section_as_supervisor", {
    p_signature_id: signatureId,
    p_supervisor_id: supervisorId,
  });
  if (error) {
    console.error("signAsSupervisor error:", error.message);
    return false;
  }
  return true;
}

// Undo supervisor signature — direct update (no RPC needed for undo)
// Only allowed before trainee has signed
export async function unsignAsSupervisor(
  instanceId: string,
  signatureId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("section_signature")
    .update({
      signed_by_supervisor_id: null,
      signed_by_supervisor_at: null,
    })
    .eq("id", signatureId)
    .is("signed_by_trainee_id", null); // safety: can't undo if trainee already signed

  if (error) {
    console.error("unsignAsSupervisor error:", error.message);
    return false;
  }
  return true;
}

// Final approval — calls DB RPC which also grants competence
export async function finalizeChecklist(
  instanceId: string,
  approverId: string
): Promise<boolean> {
  const { error } = await supabase.rpc("finalize_checklist", {
    p_instance_id: instanceId,
    p_approver_id: approverId,
  });
  if (error) {
    console.error("finalizeChecklist error:", error.message);
    return false;
  }
  return true;
}
