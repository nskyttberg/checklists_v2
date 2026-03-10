"use client";
// app/(employee)/my/components/home-view.tsx
// CHANGED: Approver section removed — moved to sign-view.tsx.
// Everything else is identical to the original.

import type { MyChecklist } from "@/lib/queries/checklists";
import { Card, Tag, ProgressBar, Icons, countSignedByTrainee } from "./ui";

interface HomeViewProps {
  myChecklists: MyChecklist[];
  loading: boolean;
  onOpenMy: (id: string) => void;
}

// ── Status helpers ─────────────────────────────────────────────────────────

function statusLabel(c: MyChecklist): string | null {
  if (c.signed_by_trainee_at) return "Väntar på godkännande";
  return null;
}

// ── Component ──────────────────────────────────────────────────────────────

export function HomeView({ myChecklists, loading, onOpenMy }: HomeViewProps) {
  if (loading) {
    return (
      <p className="text-petrol-60 text-sm text-center py-12">Laddar...</p>
    );
  }

  if (myChecklists.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-bold text-petrol mb-1">Inga aktiva upplärningar</p>
        <p className="text-petrol-60 text-sm">
          Kontakta din chef för att tilldelas en ny checklista.
        </p>
      </div>
    );
  }

  // Nudge: show subtle info if any checklist is ready to finalize
  const readyCount = myChecklists.filter(
    (c) => !c.signed_by_trainee_at &&
           c.sections.every((s) => s.signed_by_trainee_id !== null)
  ).length;

  return (
    <div>
      {readyCount > 0 && (
        <div
          className="rounded-[10px] mb-4"
          style={{
            backgroundColor: "var(--color-petrol-20)",
            borderLeft: "3px solid var(--color-petrol)",
            padding: "11px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="7" stroke="var(--color-petrol)" strokeWidth="1.4" />
            <path d="M5 8l2.5 2.5L11 5.5" stroke="var(--color-petrol)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p style={{ fontSize: 13, color: "var(--color-petrol)", fontWeight: 600 }}>
            {readyCount === 1
              ? "En checklista klar att slutsignera"
              : `${readyCount} checklistor klara att slutsignera`}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {myChecklists.map((c) => {
          const signed  = countSignedByTrainee(c.sections);
          const total   = c.sections.length;
          const label   = statusLabel(c);

          return (
            <Card key={c.id} onClick={() => onOpenMy(c.id)}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  {label && (
                    <span
                      className="inline-block text-[11px] font-semibold rounded-full mb-2"
                      style={{
                        backgroundColor: "var(--color-petrol-20)",
                        color: "var(--color-petrol-60)",
                        padding: "2px 10px",
                      }}
                    >
                      {label}
                    </span>
                  )}
                  <p className="font-bold text-petrol text-[15px] mb-1">
                    {c.template_name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag label={c.work_task_category ?? ""} />
                    <span className="text-petrol-60 text-[13px]">
                      {c.work_task_name}
                    </span>
                  </div>
                </div>
                <div className="text-petrol-60 shrink-0 ml-2">
                  <Icons.chevronRight />
                </div>
              </div>

              <ProgressBar signed={signed} total={total} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}