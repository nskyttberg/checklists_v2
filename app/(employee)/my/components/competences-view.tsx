"use client";
// app/(employee)/my/components/competences-view.tsx
// NEW FILE. Shows the logged-in employee's own competences and all colleagues'.
//
// Data source: lib/queries/licences.ts — fetchEmployeeLicences()
// Types used:  EmployeeLicence, LicenceMethod, LicenceLevel, GrantStatus
//              computeGrantStatus, formatGrantDate (all from licences.ts)
//
// Design rules:
// - Uses the same Tailwind v4 tokens as the rest of /my/
// - No new colour values — only CSS variables already defined in globals.css
// - Orange (accent) used only for primary action buttons; status chips use
//   success / warning / error tokens

import { useState } from "react";
import type {
  EmployeeLicence,
  LicenceMethod,
  LicenceLevel,
  GrantStatus,
} from "@/lib/licence";
import { Tag } from "./ui";

// ── Types ─────────────────────────────────────────────────────────────────

interface CompetencesViewProps {
  licences:          EmployeeLicence[];
  currentEmployeeId: string | null;
  loading:           boolean;
}

// ── Status helpers ────────────────────────────────────────────────────────

const STATUS_CFG: Record<GrantStatus, { bg: string; text: string; label: string }> = {
  valid:    { bg: "var(--color-success-light)", text: "var(--color-success)", label: "Giltig"    },
  expiring: { bg: "var(--color-warning-light)", text: "var(--color-warning)", label: "Löper ut"  },
  expired:  { bg: "var(--color-error-light)",   text: "var(--color-error)",   label: "Utgången"  },
};

function StatusChip({ status }: { status: GrantStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 6,
        padding: "3px 9px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  );
}

function daysLeftText(expiresAt: string | null): string | null {
  if (!expiresAt || expiresAt === "—") return null;
  const today = new Date();
  const exp   = new Date(expiresAt);
  const days  = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0)  return `Utgick för ${Math.abs(days)} dagar sedan`;
  if (days === 0) return "Utgår idag";
  return `${days} dagar kvar`;
}

// ── Summary tiles (expired / expiring / valid count) ─────────────────────

function SummaryTiles({ methods }: { methods: LicenceMethod[] }) {
  const levels = methods.flatMap((m) => m.levels);
  const counts = {
    expired:  levels.filter((l) => l.status === "expired").length,
    expiring: levels.filter((l) => l.status === "expiring").length,
    valid:    levels.filter((l) => l.status === "valid").length,
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
      {(["expired", "expiring", "valid"] as GrantStatus[]).map((s) => {
        const cfg = STATUS_CFG[s];
        const labels = { expired: "Röda", expiring: "Gula", valid: "Gröna" } as const;
        return (
          <div
            key={s}
            style={{
              backgroundColor: cfg.bg,
              borderRadius: 12,
              padding: "12px 8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 800, color: cfg.text, lineHeight: 1 }}>
              {counts[s]}
            </div>
            <div style={{ fontSize: 11, color: cfg.text, fontWeight: 600, marginTop: 3 }}>
              {labels[s]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Single level row inside a method card ─────────────────────────────────

function LevelRow({ level, isLast }: { level: LicenceLevel; isLast: boolean }) {
  const daysText = daysLeftText(level.expires);
  const cfg      = STATUS_CFG[level.status];

  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--color-sand)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-petrol)", marginBottom: 2 }}>
          {level.label}
        </p>
        {level.expires !== "—" && (
          <p style={{ fontSize: 12, color: "var(--color-petrol-60)" }}>
            Kontroll: {level.expires}
          </p>
        )}
        {daysText && (
          <p style={{ fontSize: 12, color: cfg.text, fontWeight: 600, marginTop: 1 }}>
            {daysText}
          </p>
        )}
      </div>
      <StatusChip status={level.status} />
    </div>
  );
}

// ── Method card (used in "Mina behörigheter") ─────────────────────────────

function MethodCard({ method }: { method: LicenceMethod }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 14,
        border: "1px solid var(--color-slate)",
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: "10px 16px",
          backgroundColor: "var(--color-cream)",
          borderBottom: "1px solid var(--color-slate)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 800, color: "var(--color-petrol)" }}>
          {method.work_task_name}
        </p>
        <StatusChip status={method.worstStatus} />
      </div>

      {/* Level rows */}
      {method.levels.map((level, i) => (
        <LevelRow
          key={level.grant.id}
          level={level}
          isLast={i === method.levels.length - 1}
        />
      ))}
    </div>
  );
}

// ── Filter pills ──────────────────────────────────────────────────────────

function FilterPills({
  options,
  active,
  onChange,
}: {
  options: string[];
  active:  string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 4,
        marginBottom: 14,
        // hide scrollbar visually but keep it functional
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      }}
    >
      {options.map((opt) => {
        const isActive = opt === active;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: "7px 14px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              border: `1.5px solid ${isActive ? "var(--color-petrol)" : "var(--color-slate)"}`,
              backgroundColor: isActive ? "var(--color-petrol)" : "white",
              color: isActive ? "white" : "var(--color-petrol-60)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {opt === "__all" ? "Alle metoder" : opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Initials avatar (inline, no import needed) ────────────────────────────

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        backgroundColor: "var(--color-petrol-20)",
        color: "var(--color-petrol-80)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ── "Allas behörigheter" row ──────────────────────────────────────────────

function ColleagueRow({ emp }: { emp: EmployeeLicence }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        border: "1px solid var(--color-slate)",
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      {/* Summary row */}
      <button
        onClick={() => setExpanded((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <InitialsAvatar name={emp.employee_name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-petrol)" }}>
            {emp.employee_name}
          </p>
          <p style={{ fontSize: 12, color: "var(--color-petrol-60)" }}>
            {emp.methods.length} {emp.methods.length === 1 ? "metod" : "metoder"}
            {emp.employee_site ? ` · ${emp.employee_site}` : ""}
          </p>
        </div>
        <StatusChip status={emp.worstStatus} />
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            flexShrink: 0,
            transition: "transform 0.15s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            color: "var(--color-petrol-60)",
          }}
        >
          <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded: list of methods */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--color-sand)",
            padding: "8px 16px 12px",
          }}
        >
          {emp.methods.map((method) => (
            <div key={method.work_task_id} style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-petrol-60)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                {method.work_task_name}
              </p>
              {method.levels.map((level) => (
                <div
                  key={level.grant.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 0",
                    borderBottom: "1px solid var(--color-sand)",
                  }}
                >
                  <p style={{ fontSize: 13, color: "var(--color-petrol-80)" }}>
                    {level.label}
                  </p>
                  <StatusChip status={level.status} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function CompetencesView({
  licences,
  currentEmployeeId,
  loading,
}: CompetencesViewProps) {
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [methodFilter, setMethodFilter] = useState("__all");

  // My own licence entry
  const myLicence = licences.find((l) => l.employee_id === currentEmployeeId);

  // All unique method names for filter pills (sorted)
  const allMethodNames = [
    "__all",
    ...Array.from(
      new Set(licences.flatMap((l) => l.methods.map((m) => m.work_task_name)))
    ).sort((a, b) => a.localeCompare(b, "sv")),
  ];

  // Filter colleagues list
  const colleagues = licences.filter((l) => l.employee_id !== currentEmployeeId);
  const filteredColleagues =
    methodFilter === "__all"
      ? colleagues
      : colleagues.filter((l) =>
          l.methods.some((m) => m.work_task_name === methodFilter)
        );

  return (
    <div>
      {/* Toggle: Mina / Allas */}
      <div
        style={{
          display: "flex",
          backgroundColor: "var(--color-sand)",
          borderRadius: 10,
          padding: 3,
          marginBottom: 16,
        }}
      >
        {([
          { id: "mine", label: "Mina behörigheter" },
          { id: "all",  label: "Allas behörigheter" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: tab === t.id ? "white" : "transparent",
              color: tab === t.id ? "var(--color-petrol)" : "var(--color-petrol-60)",
              boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <p className="text-petrol-60 text-sm text-center py-12">Laddar...</p>
      )}

      {/* ── Mina behörigheter ────────────────────────────────────────────── */}
      {!loading && tab === "mine" && (
        <>
          {!myLicence || myLicence.methods.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-bold text-petrol mb-1">Inga behörigheter registrerade</p>
              <p className="text-petrol-60 text-sm">Kontakta din chef om detta verkar fel.</p>
            </div>
          ) : (
            <>
              <SummaryTiles methods={myLicence.methods} />

              {/* Expired warning banner */}
              {myLicence.worstStatus === "expired" && (
                <div
                  style={{
                    backgroundColor: "var(--color-error-light)",
                    border: "1px solid rgba(194,84,80,0.3)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginBottom: 16,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                    <path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5Z" stroke="var(--color-error)" strokeWidth="1.3" strokeLinejoin="round" />
                    <path d="M7.5 6v3M7.5 10.5h.01" stroke="var(--color-error)" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <p style={{ fontSize: 13, color: "var(--color-error)" }}>
                    <strong>Behörighet utgången.</strong> Kontakta metodansvarig eller chef.
                  </p>
                </div>
              )}

              {myLicence.methods.map((m) => (
                <MethodCard key={m.work_task_id} method={m} />
              ))}
            </>
          )}
        </>
      )}

      {/* ── Allas behörigheter ───────────────────────────────────────────── */}
      {!loading && tab === "all" && (
        <>
          <FilterPills
            options={allMethodNames}
            active={methodFilter}
            onChange={setMethodFilter}
          />

          {filteredColleagues.length === 0 ? (
            <p className="text-petrol-60 text-sm text-center py-12">
              Inga behörigheter hittades.
            </p>
          ) : (
            filteredColleagues.map((emp) => (
              <ColleagueRow key={emp.employee_id} emp={emp} />
            ))
          )}
        </>
      )}
    </div>
  );
}