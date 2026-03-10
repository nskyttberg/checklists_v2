"use client";
// app/(employee)/my/components/sign-view.tsx
// NEW FILE. Replaces the approver+supervisor sections that were in home-view.
// Keeps the exact same UI patterns from the existing codebase (Card, Tag,
// ProgressBar, Icons from ui.tsx) — no new styling patterns introduced.

import type { MyChecklist } from "@/lib/queries/checklists";
import { Card, Tag, ProgressBar, Icons, countSignedBySupervisor } from "./ui";

interface SignViewProps {
  supervisable: MyChecklist[];
  approvable:   MyChecklist[];
  loading:      boolean;
  onOpenSupervisor: (id: string) => void; // direct to sign view, skips list
  onApprove: (id: string) => void;
}

// ── Small section heading ─────────────────────────────────────────────────

function SectionHeading({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "var(--color-petrol-60)",
        marginBottom: 10,
      }}
    >
      {text}
    </p>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export function SignView({
  supervisable,
  approvable,
  loading,
  onOpenSupervisor,
  onApprove,
}: SignViewProps) {
  if (loading) {
    return (
      <p className="text-petrol-60 text-sm text-center py-12">Laddar...</p>
    );
  }

  const nothing = supervisable.length === 0 && approvable.length === 0;
  if (nothing) {
    return (
      <div className="text-center py-16">
        <p className="font-bold text-petrol mb-1">Inget att signera</p>
        <p className="text-petrol-60 text-sm">
          Här visas checklistor du ska handleda eller godkänna.
        </p>
      </div>
    );
  }

  return (
    <div>

      {/* ── Approver section ────────────────────────────────────────────── */}
      {approvable.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeading text={`Att godkänna (${approvable.length})`} />
          <div className="flex flex-col gap-2.5">
            {approvable.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate"
                style={{ padding: "16px 18px" }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-petrol text-[15px] mb-0.5">
                      {c.employee_name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag label={c.work_task_category ?? ""} />
                      <span className="text-petrol-60 text-[13px]">
                        {c.work_task_name}
                      </span>
                    </div>
                    <p className="text-petrol-60 text-xs mt-1">
                      Alla rubriker signerade · redo för godkännande
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onApprove(c.id)}
                  className="w-full text-[14px] font-semibold text-white bg-accent rounded-3xl border-0"
                  style={{ padding: "13px 0", cursor: "pointer", minHeight: 48 }}
                >
                  Godkänn och bevilja behörighet
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Supervisor section ───────────────────────────────────────────── */}
      {supervisable.length > 0 && (
        <div>
          <SectionHeading text={`Handledarsignering (${supervisable.length})`} />
          <div className="flex flex-col gap-2.5">
            {supervisable.map((c) => {
              const signed    = countSignedBySupervisor(c.sections);
              const remaining = c.sections.length - signed;
              return (
                <Card key={c.id} onClick={() => onOpenSupervisor(c.id)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-petrol text-[15px] mb-1">
                        {c.employee_name}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag label={c.work_task_category ?? ""} />
                        <span className="text-petrol-60 text-[13px]">
                          {c.work_task_name}
                        </span>
                      </div>
                    </div>
                    {remaining > 0 && (
                      <span
                        className="shrink-0 ml-2 text-[11px] font-semibold rounded-full"
                        style={{
                          backgroundColor: "var(--color-petrol-20)",
                          color: "var(--color-petrol)",
                          padding: "3px 10px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {remaining} väntar
                      </span>
                    )}
                  </div>
                  <ProgressBar signed={signed} total={c.sections.length} />
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}