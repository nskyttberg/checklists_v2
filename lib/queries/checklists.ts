// lib/queries/checklists.ts
// All Supabase queries related to checklists.
// Returns typed data ready for UI components.
// No business logic here — only data fetching and mutation.

import { supabase } from "@/lib/supabase";

// ——— Shared shape used across all /my/ views ——————————————————————————————

export interface SectionData {
  signature_id: string;
  section_id: string;
  signed_by_trainee_id: string | null;
  signed_by_trainee_at: string | null;
  signed_by_supervisor_id: string | null;
  signed_by_supervisor_at: string | null;
  signed_by_supervisor_name: string | null;
  title: string;
  sort_order: number;
  items: { id: string; text: string; sort_order: number }[];
}

export interface MyChecklist {
  id: string;
  status: string;
  assigned_at: string;
  employee_id: string;
  employee_name: string;
  signed_by_trainee_at: string | null;  // instance-level trainee final signature
  template_name: string;
  template_version: number;
  competence_display_name: string;
  competence_level: number;
  work_task_id: string;
  work_task_name: string;
  work_task_category: string | null;
  sections: SectionData[];
}

// ——— Fetch helpers ————————————————————————————————————————————————————————

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
      signed_by_supervisor_name: row.signed_by_supervisor?.name ?? null,
      title: row.template_section.title,
      sort_order: row.template_section.sort_order,
      items: (row.template_section.template_item ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((item: any) => ({ id: item.id, text: item.text, sort_order: item.sort_order })),
    }));
}

const SECTION_SIGNATURE_SELECT = `
  id,
  section_id,
  signed_by_trainee_id,
  signed_by_trainee_at,
  signed_by_supervisor_id,
  signed_by_supervisor_at,
  signed_by_supervisor:signed_by_supervisor_id ( name ),
  template_section (
    title,
    sort_order,
    template_item ( id, text, sort_order )
  )
`;

const INSTANCE_SELECT = `
  id,
  status,
  assigned_at,
  signed_by_trainee_at,
  employee_id,
  employee:employee_id ( name ),
  checklist_template ( name, version ),
  competence_definition (
    level,
    display_name,
    work_task ( id, name, category )
  ),
  section_signature (
    ${SECTION_SIGNATURE_SELECT}
  )
`;

function mapInstance(row: any): MyChecklist {
  return {
    id: row.id,
    status: row.status,
    assigned_at: row.assigned_at,
    signed_by_trainee_at: row.signed_by_trainee_at ?? null,
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
  };
}

// ——— Public query functions ———————————————————————————————————————————————

export async function fetchMyChecklists(employeeId: string): Promise<MyChecklist[]> {
  const { data, error } = await supabase
    .from("checklist_instance")
    .select(INSTANCE_SELECT)
    .eq("employee_id", employeeId)
    .eq("status", "active");

  if (error) { console.error("fetchMyChecklists error:", error); return []; }
  return (data ?? []).map(mapInstance);
}

export async function fetchSupervisableChecklists(supervisorId: string): Promise<MyChecklist[]> {
  const { data: competences } = await supabase
    .from("employee_competence")
    .select("work_task_id, level")
    .eq("employee_id", supervisorId);

  if (!competences || competences.length === 0) return [];

  const { data: instances, error } = await supabase
    .from("checklist_instance")
    .select(INSTANCE_SELECT)
    .eq("status", "active")
    .neq("employee_id", supervisorId);

  if (error || !instances) return [];

  return instances
    .filter((row: any) => {
      const workTaskId = row.competence_definition?.work_task?.id;
      const requiredLevel = row.competence_definition?.level ?? 1;
      return competences.some(
        (c) => c.work_task_id === workTaskId && c.level >= requiredLevel
      );
    })
    .map(mapInstance);
}

// Checklists ready for approver final sign-off.
// Requires: trainee has final-signed + all sections signed by both parties.
export async function fetchApprovableChecklists(approverId: string): Promise<MyChecklist[]> {
  const { data: approverRows } = await supabase
    .from("approver")
    .select("work_task_id")
    .eq("employee_id", approverId);

  if (!approverRows || approverRows.length === 0) return [];

  const approvesAll = approverRows.some((r) => r.work_task_id === null);
  const approvedTaskIds = approverRows
    .filter((r) => r.work_task_id !== null)
    .map((r) => r.work_task_id as string);

  const { data: instances, error } = await supabase
    .from("checklist_instance")
    .select(INSTANCE_SELECT)
    .eq("status", "active")
    .not("signed_by_trainee_at", "is", null)
    .neq("employee_id", approverId);

  if (error || !instances) return [];

  return instances
    .filter((row: any) => {
      const workTaskId = row.competence_definition?.work_task?.id;
      if (!approvesAll && !approvedTaskIds.includes(workTaskId)) return false;
      // All sections must be fully signed
      const sections: any[] = row.section_signature ?? [];
      return sections.every(
        (s) => s.signed_by_trainee_id !== null && s.signed_by_supervisor_id !== null
      );
    })
    .map(mapInstance);
}

// ——— Signing mutations ————————————————————————————————————————————————————

export async function signAsTrainee(
  instanceId: string,
  signatureId: string,
  employeeId: string
): Promise<boolean> {
  const { error } = await supabase.rpc("sign_section_as_trainee", {
    p_signature_id: signatureId,
    p_employee_id: employeeId,
  });
  if (error) { console.error("signAsTrainee error:", error.message); return false; }
  return true;
}

export async function signAsSupervisor(
  instanceId: string,
  signatureId: string,
  supervisorId: string
): Promise<boolean> {
  const { error } = await supabase.rpc("sign_section_as_supervisor", {
    p_signature_id: signatureId,
    p_supervisor_id: supervisorId,
  });
  if (error) { console.error("signAsSupervisor error:", error.message); return false; }
  return true;
}

// Supervisor can unsign a section as long as the trainee has not yet
// final-signed the entire checklist (signed_by_trainee_at IS NULL on the instance).
// Once the trainee has final-signed, the checklist is locked for approver review.
export async function unsignAsSupervisor(
  instanceId: string,
  signatureId: string
): Promise<boolean> {
  // Verify the instance has not been final-signed by the trainee
  const { data: instance } = await supabase
    .from("checklist_instance")
    .select("signed_by_trainee_at")
    .eq("id", instanceId)
    .single();

  if (instance?.signed_by_trainee_at) {
    console.error("unsignAsSupervisor: checklist already final-signed by trainee");
    return false;
  }

  const { error } = await supabase
    .from("section_signature")
    .update({ signed_by_supervisor_id: null, signed_by_supervisor_at: null })
    .eq("id", signatureId);

  if (error) { console.error("unsignAsSupervisor error:", error.message); return false; }
  return true;
}

// Trainee final-signs the whole checklist.
// Requires all sections to be signed by trainee first.
export async function finalizeAsTrainee(
  instanceId: string,
  employeeId: string
): Promise<boolean> {
  const { error } = await supabase.rpc("finalize_checklist_as_trainee", {
    p_instance_id: instanceId,
    p_employee_id: employeeId,
  });
  if (error) { console.error("finalizeAsTrainee error:", error.message); return false; }
  return true;
}

// Approver final-approves — sets status=completed and grants competence.
export async function finalizeChecklist(
  instanceId: string,
  approverId: string
): Promise<boolean> {
  const { error } = await supabase.rpc("finalize_checklist", {
    p_instance_id: instanceId,
    p_approver_id: approverId,
  });
  if (error) { console.error("finalizeChecklist error:", error.message); return false; }
  return true;
}