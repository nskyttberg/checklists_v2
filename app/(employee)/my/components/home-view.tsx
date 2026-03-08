"use client";
// app/(employee)/my/components/home-view.tsx

import type { MyChecklist, SectionData } from "@/lib/queries/checklists";

// ——— Helpers —————————————————————————————————————————————————————————————

function countTraineeSigned(sections: SectionData[]) {
  return sections.filter((s) => s.signed_by_trainee_id !== null).length;
}

// ——— Segment progress ————————————————————————————————————————————————————

function SegmentProgress({ signed, total }: { signed: number; total: number }) {
  const complete = signed === total && total > 0;
  const useBar = total > 8;

  if (useBar) {
    const pct = total > 0 ? (signed / total) * 100 : 0;
    return (
      <div className="flex items-center gap-2">
        <div style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: "var(--color-slate)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, backgroundColor: complete ? "var(--color-success)" : "var(--color-petrol-80)", transition: "width 0.3s ease" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: complete ? "var(--color-success)" : "var(--color-petrol-60)", minWidth: 28, textAlign: "right" }}>
          {signed}/{total}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: i < signed ? complete ? "var(--color-success)" : "var(--color-petrol)" : "var(--color-slate)", transition: "background-color 0.2s ease" }} />
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: complete ? "var(--color-success)" : "var(--color-petrol-60)" }}>
        {signed}/{total}
      </span>
    </div>
  );
}

// ——— Category tag ————————————————————————————————————————————————————————

function CategoryTag({ label }: { label: string }) {
  if (!label) return null;
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: "var(--color-petrol-80)", backgroundColor: "var(--color-sand)", padding: "2px 8px", borderRadius: 99, border: "1px solid var(--color-slate)" }}>
      {label}
    </span>
  );
}

// ——— Chevron ————————————————————————————————————————————————————————————

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M7 4L12 9L7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ——— Press handlers (shared) —————————————————————————————————————————————

const pressDown = (e: React.PointerEvent<HTMLButtonElement>) => {
  e.currentTarget.style.opacity = "0.75";
  e.currentTarget.style.transform = "scale(0.985)";
};
const pressUp = (e: React.PointerEvent<HTMLButtonElement>) => {
  e.currentTarget.style.opacity = "1";
  e.currentTarget.style.transform = "scale(1)";
};

// ——— Checklist card ——————————————————————————————————————————————————————

function ChecklistCard({ inst, onClick }: { inst: MyChecklist; onClick: () => void }) {
  const signed   = countTraineeSigned(inst.sections);
  const total    = inst.sections.length;
  const complete = signed === total && total > 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left"
      style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${complete ? "var(--color-success)" : "var(--color-slate)"}`, padding: "18px 18px 16px", cursor: "pointer", WebkitTapHighlightColor: "transparent", display: "block", transition: "opacity 0.1s ease, transform 0.1s ease" }}
      onPointerDown={pressDown} onPointerUp={pressUp} onPointerLeave={pressUp}
    >
      <div className="flex items-start justify-between" style={{ marginBottom: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--color-petrol)", marginBottom: 5, lineHeight: 1.3 }}>
            {inst.template_name}
          </p>
          <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
            <CategoryTag label={inst.work_task_category ?? ""} />
            <span style={{ fontSize: 13, color: "var(--color-petrol-60)" }}>{inst.work_task_name}</span>
          </div>
        </div>
        <div style={{ color: "var(--color-petrol-60)", flexShrink: 0, marginLeft: 8, marginTop: 2 }}>
          <ChevronRight />
        </div>
      </div>

      <SegmentProgress signed={signed} total={total} />

      {complete && !inst.signed_by_trainee_at && (
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", marginTop: 8 }}>
          Redo att slutsignera
        </p>
      )}
      {inst.signed_by_trainee_at && (
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-success)", marginTop: 8 }}>
          Väntar på godkännande
        </p>
      )}
    </button>
  );
}

// ——— Supervisor card —————————————————————————————————————————————————————

function SupervisorCard({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left"
      style={{ backgroundColor: "var(--color-petrol)", borderRadius: 16, padding: "18px 20px", cursor: "pointer", WebkitTapHighlightColor: "transparent", border: "none", display: "block", transition: "opacity 0.1s ease, transform 0.1s ease" }}
      onPointerDown={pressDown} onPointerUp={pressUp} onPointerLeave={pressUp}
    >
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 3 }}>
            Signera som handledare
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            {count} {count === 1 ? "kollega väntar" : "kollegor väntar"}
          </p>
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)" }}><ChevronRight /></div>
      </div>
    </button>
  );
}

// ——— Approver card ———————————————————————————————————————————————————————

function ApproverCard({
  checklists,
  onApprove,
}: {
  checklists: MyChecklist[];
  onApprove: (id: string) => void;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        border: "1px solid var(--color-petrol-40)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--color-slate)" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-petrol)", letterSpacing: "0.02em" }}>
          Godkänn upplärning
        </p>
        <p style={{ fontSize: 12, color: "var(--color-petrol-60)", marginTop: 2 }}>
          {checklists.length} {checklists.length === 1 ? "checklista väntar" : "checklistor väntar"} på ditt godkännande
        </p>
      </div>

      {/* One row per approvable checklist */}
      {checklists.map((inst, i) => (
        <div
          key={inst.id}
          className="flex items-center justify-between"
          style={{
            padding: "14px 18px",
            borderBottom: i < checklists.length - 1 ? "1px solid var(--color-slate)" : undefined,
          }}
        >
          <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-petrol)", marginBottom: 2 }}>
              {inst.employee_name}
            </p>
            <p style={{ fontSize: 12, color: "var(--color-petrol-60)" }}>
              {inst.template_name}
            </p>
          </div>
          <button
            onClick={() => onApprove(inst.id)}
            style={{
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "white",
              backgroundColor: "var(--color-success)",
              border: "none",
              borderRadius: 99,
              padding: "8px 16px",
              cursor: "pointer",
              minHeight: 36,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Godkänn
          </button>
        </div>
      ))}
    </div>
  );
}

// ——— Skeleton ————————————————————————————————————————————————————————————

function SkeletonCard() {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, border: "1px solid var(--color-slate)", padding: "18px 18px 16px" }}>
      <div style={{ height: 18, width: "60%", borderRadius: 6, backgroundColor: "var(--color-slate)", marginBottom: 10, opacity: 0.6 }} />
      <div style={{ height: 12, width: "35%", borderRadius: 6, backgroundColor: "var(--color-slate)", marginBottom: 16, opacity: 0.4 }} />
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: "var(--color-slate)", opacity: 0.5 }} />
        ))}
      </div>
    </div>
  );
}

// ——— Section label ———————————————————————————————————————————————————————

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-petrol-60)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10, marginTop: 24, paddingLeft: 2 }}>
      {text}
    </p>
  );
}

// ——— Empty state —————————————————————————————————————————————————————————

function EmptyState() {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, border: "1px solid var(--color-slate)", padding: "40px 24px", textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-petrol)", marginBottom: 6 }}>
        Inga pågående checklistor
      </p>
      <p style={{ fontSize: 13, color: "var(--color-petrol-60)" }}>
        Din chef tilldelar checklistor när det är dags.
      </p>
    </div>
  );
}

// ——— Main component ——————————————————————————————————————————————————————

interface HomeViewProps {
  myChecklists: MyChecklist[];
  supervisable: MyChecklist[];
  approvable: MyChecklist[];
  loading: boolean;
  onOpenMy: (id: string) => void;
  onOpenSupervisorList: () => void;
  onApprove: (instanceId: string) => void;
}

export function HomeView({
  myChecklists,
  supervisable,
  approvable,
  loading,
  onOpenMy,
  onOpenSupervisorList,
  onApprove,
}: HomeViewProps) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const hasMyLists  = myChecklists.length > 0;
  const hasSupLists = supervisable.length > 0;
  const hasApprove  = approvable.length > 0;

  return (
    <div>
      {/* My checklists */}
      {hasMyLists && (
        <>
          <SectionLabel text="Mina checklistor" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myChecklists.map((inst) => (
              <ChecklistCard key={inst.id} inst={inst} onClick={() => onOpenMy(inst.id)} />
            ))}
          </div>
        </>
      )}

      {/* Supervisor section */}
      {hasSupLists && (
        <>
          <SectionLabel text="Som handledare" />
          <SupervisorCard count={supervisable.length} onClick={onOpenSupervisorList} />
        </>
      )}

      {/* Approver section */}
      {hasApprove && (
        <>
          <SectionLabel text="Godkännande" />
          <ApproverCard checklists={approvable} onApprove={onApprove} />
        </>
      )}

      {/* Empty */}
      {!hasMyLists && !hasSupLists && !hasApprove && (
        <>
          <SectionLabel text="Mina checklistor" />
          <EmptyState />
        </>
      )}
    </div>
  );
}