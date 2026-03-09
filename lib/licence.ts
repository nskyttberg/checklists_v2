//
// lib/licence.ts
// Domain logic for the licence (körkort) module.
// Pure functions + Supabase queries + mutations — no UI.
//

import { supabase } from "@/lib/supabase";

// -------------------------------------------------
// Constants
// -------------------------------------------------

export const COMPETENCE_TYPE_LABELS: Record<string, string> = {
  examination:     "Undersökning",
  reporting:       "Svar",
  referral_review: "Remissgranskning",
  delegation:      "Delegering",
  remote_work:     "Distansarbete",
};

const EXPIRING_SOON_DAYS = 90; // orange: expires_at within 90 days

// -------------------------------------------------
// Types
// -------------------------------------------------

export type GrantStatus = "valid" | "expiring" | "expired";

export interface EmployeeCompetence {
  id: string;
  employee_id: string;
  work_task_id: string;
  competence_type: string;
  level: number;
  source: "checklist" | "manual";
  source_reference_id: string | null;
  granted_at: string;
  expires_at: string | null;
  granted_by_id: string | null;
  revoked_at: string | null;
}

export interface LicenceLevel {
  grant: EmployeeCompetence;
  label: string;
  status: GrantStatus;
  expires: string;
  hasHistory: boolean;
}

export interface LicenceMethod {
  work_task_id: string;
  work_task_name: string;
  levels: LicenceLevel[];
  worstStatus: GrantStatus;
}

export interface EmployeeLicence {
  employee_id: string;
  employee_name: string;
  employee_site: string | null;
  methods: LicenceMethod[];
  worstStatus: GrantStatus;
}

export interface CompetenceDefinitionSlot {
  id: string;
  work_task_id: string;
  competence_type: string;
  level: number;
  display_name: string;
  validity_months: number | null;
}

// -------------------------------------------------
// Status logic
// -------------------------------------------------

const STATUS_PRIORITY: Record<GrantStatus, number> = {
  expired: 3, expiring: 2, valid: 1,
};

export function computeGrantStatus(grant: EmployeeCompetence): GrantStatus {
  if (!grant.expires_at) return "valid";
  const today     = new Date();
  const expiresAt = new Date(grant.expires_at);

  if (expiresAt < today) return "expired";

  const daysUntilExpiry = (expiresAt.getTime() - today.getTime()) / 86_400_000;
  if (daysUntilExpiry < EXPIRING_SOON_DAYS) return "expiring";

  return "valid";
}

export function worstStatus(statuses: GrantStatus[]): GrantStatus {
  return statuses.reduce<GrantStatus>(
    (worst, s) => STATUS_PRIORITY[s] > STATUS_PRIORITY[worst] ? s : worst,
    "valid",
  );
}

export function formatGrantDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("sv-SE");
}

export function computeExpiresAt(validityMonths: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + validityMonths);
  return d.toISOString().split("T")[0];
}

export function buildLevelLabel(
  competenceType: string,
  level: number,
  displayName: string,
): string {
  const typeLabel = COMPETENCE_TYPE_LABELS[competenceType] ?? competenceType;
  return `Nivå ${level} · ${typeLabel} · ${displayName}`;
}

// -------------------------------------------------
// Data transformation
// -------------------------------------------------

export function groupIntoEmployeeLicences(rows: any[]): EmployeeLicence[] {
  const empMap = new Map<string, EmployeeLicence>();

  for (const row of rows) {
    if (!empMap.has(row.employee_id)) {
      empMap.set(row.employee_id, {
        employee_id:   row.employee_id,
        employee_name: row.employee_name,
        employee_site: row.employee_site,
        methods:       [],
        worstStatus:   "valid",
      });
    }
    const emp = empMap.get(row.employee_id)!;

    let method = emp.methods.find(m => m.work_task_id === row.work_task_id);
    if (!method) {
      method = {
        work_task_id:   row.work_task_id,
        work_task_name: row.work_task_name,
        levels:         [],
        worstStatus:    "valid",
      };
      emp.methods.push(method);
    }

    method.levels.push({
      grant:      row,
      label:      buildLevelLabel(row.competence_type, row.level, row.display_name),
      status:     computeGrantStatus(row),
      expires:    formatGrantDate(row.expires_at),
      hasHistory: true,
    });
  }

  for (const emp of empMap.values()) {
    for (const method of emp.methods) {
      method.levels.sort((a, b) => a.grant.level - b.grant.level);
      method.worstStatus = worstStatus(method.levels.map(l => l.status));
    }
    emp.methods.sort((a, b) =>
      a.work_task_name.localeCompare(b.work_task_name, "sv"),
    );
    emp.worstStatus = worstStatus(emp.methods.map(m => m.worstStatus));
  }

  return Array.from(empMap.values()).sort((a, b) =>
    a.employee_name.localeCompare(b.employee_name, "sv"),
  );
}

// -------------------------------------------------
// Queries
// -------------------------------------------------

export async function fetchEmployeeLicences(): Promise<EmployeeLicence[]> {
  // Fetch grants and competence_definitions in parallel — no direct FK between them.
  // We join in app code on (work_task_id + competence_type + level).
  const [grantsResult, defsResult] = await Promise.all([
    supabase
      .from("employee_competence")
      .select(`
        id, employee_id, work_task_id, competence_type, level,
        source, source_reference_id, granted_at, expires_at,
        granted_by_id, revoked_at,
        employee:employee_id ( name, site ),
        work_task:work_task_id ( name )
      `)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false }),
    supabase
      .from("competence_definition")
      .select("work_task_id, competence_type, level, display_name"),
  ]);

  if (grantsResult.error) throw grantsResult.error;
  if (defsResult.error)   throw defsResult.error;

  // Build lookup: "workTaskId|competenceType|level" → display_name
  const defLookup = new Map<string, string>();
  for (const d of defsResult.data ?? []) {
    defLookup.set(`${d.work_task_id}|${d.competence_type}|${d.level}`, d.display_name);
  }

  const rows = (grantsResult.data ?? []).map((r: any) => ({
    ...r,
    employee_name:  r.employee?.name  ?? "Okänd",
    employee_site:  r.employee?.site  ?? null,
    work_task_name: r.work_task?.name ?? "Okänd metod",
    display_name:   defLookup.get(`${r.work_task_id}|${r.competence_type}|${r.level}`) ?? "",
  }));

  return groupIntoEmployeeLicences(rows);
}

export async function fetchCompetenceDefinitionsForTask(
  workTaskId: string,
): Promise<CompetenceDefinitionSlot[]> {
  const { data, error } = await supabase
    .from("competence_definition")
    .select("id, work_task_id, competence_type, level, display_name, validity_months")
    .eq("work_task_id", workTaskId)
    .order("level");
  if (error) throw error;
  return (data ?? []) as CompetenceDefinitionSlot[];
}

export async function hasHistoricalGrant(
  employeeId: string,
  workTaskId: string,
  competenceType: string,
  level: number,
): Promise<boolean> {
  const { count } = await supabase
    .from("employee_competence")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("work_task_id", workTaskId)
    .eq("competence_type", competenceType)
    .eq("level", level);
  return (count ?? 0) > 0;
}

// -------------------------------------------------
// Mutations
// -------------------------------------------------

export async function renewMethod(
  employeeId: string,
  levels: LicenceLevel[],
  grantedById: string,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Fetch validity_months per level from competence_definition
  // delegation = 12 months, everything else = 24 months (from competence_definition.validity_months)
  const workTaskId = levels[0].grant.work_task_id;
  const defs = await fetchCompetenceDefinitionsForTask(workTaskId);
  const defMap = new Map(defs.map(d => (`${d.competence_type}|${d.level}`, d)));

  const { error: revokeError } = await supabase
    .from("employee_competence")
    .update({ revoked_at: today })
    .in("id", levels.map(l => l.grant.id));
  if (revokeError) throw revokeError;

  const { error: insertError } = await supabase
    .from("employee_competence")
    .insert(
      levels.map(l => {
        const def = defMap.get(`${l.grant.competence_type}|${l.grant.level}`);
        const validityMonths = def?.validity_months ?? (l.grant.competence_type === "delegation" ? 12 : 24);
        return {
          employee_id:     employeeId,
          work_task_id:    l.grant.work_task_id,
          competence_type: l.grant.competence_type,
          level:           l.grant.level,
          source:          "manual" as const,
          granted_at:      today,
          expires_at:      computeExpiresAt(validityMonths),
          granted_by_id:   grantedById,
        };
      }),
    );
  if (insertError) throw insertError;
}

export async function adjustMethod(
  employeeId: string,
  currentLevels: LicenceLevel[],
  selectedDefs: CompetenceDefinitionSlot[],
  grantedById: string,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  if (currentLevels.length > 0) {
    const { error } = await supabase
      .from("employee_competence")
      .update({ revoked_at: today })
      .in("id", currentLevels.map(l => l.grant.id));
    if (error) throw error;
  }

  if (selectedDefs.length === 0) return;

  const { error: insertError } = await supabase
    .from("employee_competence")
    .insert(
      selectedDefs.map(def => ({
        employee_id:     employeeId,
        work_task_id:    def.work_task_id,
        competence_type: def.competence_type,
        level:           def.level,
        source:          "manual" as const,
        granted_at:      today,
        expires_at:      computeExpiresAt(def.validity_months ?? 24),
        granted_by_id:   grantedById,
      })),
    );
  if (insertError) throw insertError;
}