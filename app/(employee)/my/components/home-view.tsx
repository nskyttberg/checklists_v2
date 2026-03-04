"use client";
// app/(employee)/my/components/home-view.tsx
//
// Design decisions:
// - No section header "Mina checklistor" — the cards ARE the content, label adds noise
// - Checklist card: method name large + bold, category tag + work task name secondary
// - Progress shown as filled segments (not bar) — more native, more scannable
// - Supervisor card: distinct visual weight, sits below trainee cards naturally
// - Active press state via CSS — native tap feedback without JS
// - Empty state: calm, not apologetic
// - Skeleton loader instead of spinner

import type { MyChecklist, SectionData } from "@/lib/queries/checklists";

// ── Helpers ────────────────────────────────────────────────────────────────

function countTraineeSigned(sections: SectionData[]) {
  return sections.filter((s) => s.signed_by_trainee_id !== null).length;
}

function countSupSigned(sections: SectionData[]) {
  return sections.filter((s) => s.signed_by_supervisor_id !== null).length;
}

// ── Segment progress ───────────────────────────────────────────────────────
// Shows discrete filled dots instead of a continuous bar.
// More readable at a glance, more native-feeling.

function SegmentProgress({
  signed,
  total,
}: {
  signed: number;
  total: number;
}) {
  const complete = signed === total && total > 0;
  // Cap visual segments at 8 — beyond that use bar
  const useBar = total > 8;

  if (useBar) {
    const pct = total > 0 ? (signed / total) * 100 : 0;
    return (
      <div className="flex items-center gap-2">
        <div
          style={{
            flex: 1,
            height: 4,
            borderRadius: 99,
            backgroundColor: "var(--color-slate)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 99,
              backgroundColor: complete
                ? "var(--color-success)"
                : "var(--color-petrol-80)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: complete ? "var(--color-success)" : "var(--color-petrol-60)",
            minWidth: 28,
            textAlign: "right",
          }}
        >
          {signed}/{total}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              backgroundColor:
                i < signed
                  ? complete
                    ? "var(--color-success)"
                    : "var(--color-petrol)"
                  : "var(--color-slate)",
              transition: "background-color 0.2s ease",
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: complete ? "var(--color-success)" : "var(--color-petrol-60)",
        }}
      >
        {signed}/{total}
      </span>
    </div>
  );
}

// ── Category tag ───────────────────────────────────────────────────────────

function CategoryTag({ label }: { label: string }) {
  if (!label) return null;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--color-petrol-80)",
        backgroundColor: "var(--color-sand)",
        padding: "2px 8px",
        borderRadius: 99,
        border: "1px solid var(--color-slate)",
      }}
    >
      {label}
    </span>
  );
}

// ── Chevron ────────────────────────────────────────────────────────────────

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M7 4L12 9L7 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Checklist card ─────────────────────────────────────────────────────────

function ChecklistCard({
  inst,
  onClick,
}: {
  inst: MyChecklist;
  onClick: () => void;
}) {
  const signed = countTraineeSigned(inst.sections);
  const total = inst.sections.length;
  const complete = signed === total && total > 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left"
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        border: `1px solid ${complete ? "var(--color-success)" : "var(--color-slate)"}`,
        padding: "18px 18px 16px",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        display: "block",
        // Native press feel via CSS
        transition: "opacity 0.1s ease, transform 0.1s ease",
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "0.75";
        (e.currentTarget as HTMLElement).style.transform = "scale(0.985)";
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "1";
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "1";
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      {/* Top row */}
      <div
        className="flex items-start justify-between"
        style={{ marginBottom: 10 }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-petrol)",
              marginBottom: 5,
              lineHeight: 1.3,
            }}
          >
            {inst.template_name}
          </p>
          <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
            <CategoryTag label={inst.work_task_category ?? ""} />
            <span
              style={{
                fontSize: 13,
                color: "var(--color-petrol-60)",
              }}
            >
              {inst.work_task_name}
            </span>
          </div>
        </div>
        <div
          style={{
            color: "var(--color-petrol-60)",
            flexShrink: 0,
            marginLeft: 8,
            marginTop: 2,
          }}
        >
          <ChevronRight />
        </div>
      </div>

      {/* Progress */}
      <SegmentProgress signed={signed} total={total} />

      {/* Complete badge */}
      {complete && (
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-success)",
            marginTop: 8,
          }}
        >
          Alla moment signerade
        </p>
      )}
    </button>
  );
}

// ── Supervisor card ────────────────────────────────────────────────────────

function SupervisorCard({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left"
      style={{
        backgroundColor: "var(--color-petrol)",
        borderRadius: 16,
        padding: "18px 20px",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        border: "none",
        display: "block",
        transition: "opacity 0.1s ease, transform 0.1s ease",
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "0.8";
        (e.currentTarget as HTMLElement).style.transform = "scale(0.985)";
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "1";
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "1";
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "white",
              marginBottom: 3,
            }}
          >
            Signera som handledare
          </p>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {count} {count === 1 ? "kollega väntar" : "kollegor väntar"}
          </p>
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)" }}>
          <ChevronRight />
        </div>
      </div>
    </button>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        border: "1px solid var(--color-slate)",
        padding: "18px 18px 16px",
      }}
    >
      <div
        style={{
          height: 18,
          width: "60%",
          borderRadius: 6,
          backgroundColor: "var(--color-slate)",
          marginBottom: 10,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          height: 12,
          width: "35%",
          borderRadius: 6,
          backgroundColor: "var(--color-slate)",
          marginBottom: 16,
          opacity: 0.4,
        }}
      />
      <div
        className="flex gap-1"
        style={{ alignItems: "center" }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              backgroundColor: "var(--color-slate)",
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Section label ──────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "var(--color-petrol-60)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        marginBottom: 10,
        marginTop: 24,
        paddingLeft: 2,
      }}
    >
      {text}
    </p>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        border: "1px solid var(--color-slate)",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--color-petrol)",
          marginBottom: 6,
        }}
      >
        Inga pågående checklistor
      </p>
      <p style={{ fontSize: 13, color: "var(--color-petrol-60)" }}>
        Din chef tilldelar checklistor när det är dags.
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface HomeViewProps {
  myChecklists: MyChecklist[];
  supervisable: MyChecklist[];
  loading: boolean;
  onOpenMy: (id: string) => void;
  onOpenSupervisorList: () => void;
}

export function HomeView({
  myChecklists,
  supervisable,
  loading,
  onOpenMy,
  onOpenSupervisorList,
}: HomeViewProps) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const hasMyLists = myChecklists.length > 0;
  const hasSupLists = supervisable.length > 0;

  return (
    <div>
      {/* My checklists */}
      {hasMyLists && (
        <>
          <SectionLabel text="Mina checklistor" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myChecklists.map((inst) => (
              <ChecklistCard
                key={inst.id}
                inst={inst}
                onClick={() => onOpenMy(inst.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Supervisor section */}
      {hasSupLists && (
        <>
          <SectionLabel text="Som handledare" />
          <SupervisorCard
            count={supervisable.length}
            onClick={onOpenSupervisorList}
          />
        </>
      )}

      {/* Empty */}
      {!hasMyLists && !hasSupLists && (
        <>
          <SectionLabel text="Mina checklistor" />
          <EmptyState />
        </>
      )}
    </div>
  );
}
