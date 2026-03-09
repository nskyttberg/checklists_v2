// lib/format.ts
// Shared formatting helpers used across admin and employee views.

export const COMPETENCE_TYPE_LABELS: Record<string, string> = {
  examination:     "Undersökning",
  reporting:       "Svar",
  referral_review: "Remissgranskning",
  delegation:      "Delegering",
  remote_work:     "Distansarbete",
};

/**
 * Full competence label — used in table cells, dialogs, and list views.
 * Example: "Nivå 1 · Undersökning · Med läkarkontroll"
 */
export function formatCompetence(
  level: number,
  competenceType: string,
  displayName: string
): string {
  const typeLabel = COMPETENCE_TYPE_LABELS[competenceType] ?? competenceType;
  return `Nivå ${level} · ${typeLabel} · ${displayName}`;
}

/**
 * Short competence label — used where space is limited (chips, tight columns).
 * Example: "Nivå 1 · Undersökning"
 */
export function formatCompetenceShort(
  level: number,
  competenceType: string
): string {
  const typeLabel = COMPETENCE_TYPE_LABELS[competenceType] ?? competenceType;
  return `Nivå ${level} · ${typeLabel}`;
}

/**
 * Format an ISO date string as a Swedish locale date.
 * Returns "—" if null.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sv-SE");
}