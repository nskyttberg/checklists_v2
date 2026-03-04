"use client";
// app/(employee)/my/components/ui.tsx
// Shared UI primitives for /my/ views.
// All use Tailwind v4 tokens from globals.css.

import type { ReactNode } from "react";
import type { SectionData } from "@/lib/queries/checklists";

// ── Icons ──────────────────────────────────────────────────────────────────

export const Icons = {
  check: (size = 14) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  back: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronRight: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  group: () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 19c0-3.5 2.5-5.5 6-5.5s6 2 6 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.5 13.5c2.5.5 4 2.2 4 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  swap: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 2v12M4 14l-3-3M4 14l3-3M12 14V2M12 2l-3 3M12 2l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("sv-SE");
}

// Count sections signed by trainee
export function countSignedByTrainee(sections: SectionData[]): number {
  return sections.filter((s) => s.signed_by_trainee_id !== null).length;
}

// Count sections signed by supervisor
export function countSignedBySupervisor(sections: SectionData[]): number {
  return sections.filter((s) => s.signed_by_supervisor_id !== null).length;
}

// Count fully signed sections (both trainee + supervisor)
export function countFullySigned(sections: SectionData[]): number {
  return sections.filter(
    (s) => s.signed_by_trainee_id !== null && s.signed_by_supervisor_id !== null
  ).length;
}

// ── ProgressBar ────────────────────────────────────────────────────────────

export function ProgressBar({
  signed,
  total,
  h = 6,
}: {
  signed: number;
  total: number;
  h?: number;
}) {
  const pct = total > 0 ? (signed / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex-1 overflow-hidden rounded-full"
        style={{ height: h, backgroundColor: "var(--color-slate)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-400"
          style={{
            width: `${pct}%`,
            backgroundColor:
              pct >= 100 ? "var(--color-success)" : "var(--color-petrol-80)",
          }}
        />
      </div>
      <span className="font-medium text-petrol text-[13px] whitespace-nowrap">
        {signed}/{total}
      </span>
    </div>
  );
}

// ── Tag ────────────────────────────────────────────────────────────────────

export function Tag({ label }: { label: string }) {
  if (!label) return null;
  return (
    <span className="inline-block text-[11px] font-semibold text-petrol-80 bg-sand px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

export function Card({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate"
      style={{
        padding: "16px 18px",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

// ── Checkbox ───────────────────────────────────────────────────────────────

export function Checkbox({
  checked,
  onClick,
  disabled,
}: {
  checked: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick?.();
      }}
      disabled={disabled}
      className="flex items-center justify-center shrink-0"
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: checked
          ? "2px solid var(--color-success)"
          : disabled
          ? "2px solid var(--color-slate)"
          : "2px solid var(--color-petrol-40)",
        backgroundColor: checked
          ? "var(--color-success)"
          : disabled
          ? "var(--color-sand)"
          : "white",
        color: checked ? "white" : "transparent",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && !checked ? 0.4 : 1,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {checked && Icons.check(16)}
    </button>
  );
}

// ── BackButton ─────────────────────────────────────────────────────────────

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-petrol-80 text-sm"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        minHeight: 48,
        padding: "8px 0",
      }}
    >
      {Icons.back()} Tillbaka
    </button>
  );
}

// ── Hint ───────────────────────────────────────────────────────────────────

export function Hint({ text }: { text: string }) {
  return (
    <div
      className="bg-cream rounded-[10px] mb-4"
      style={{ padding: "12px 16px", borderLeft: "3px solid var(--color-petrol-40)" }}
    >
      <p className="text-petrol-80 text-[13px] leading-relaxed">{text}</p>
    </div>
  );
}

// ── ItemList (moment under en rubrik) ──────────────────────────────────────

export function ItemList({
  items,
}: {
  items: { id: string; text: string }[];
}) {
  if (!items?.length) return null;
  return (
    <div className="mb-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-2 mb-1">
          <span className="text-slate text-[10px] mt-1">◆</span>
          <span className="text-petrol-80 text-[13px]">{item.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── InstanceHeader (vit box med titel + progress) ──────────────────────────

export function InstanceHeader({
  title,
  subtitle,
  tag,
  sections,
  mode,
}: {
  title: string;
  subtitle: string;
  tag: string;
  sections: SectionData[];
  mode: "trainee" | "supervisor";
}) {
  const signed =
    mode === "trainee"
      ? countSignedByTrainee(sections)
      : countSignedBySupervisor(sections);

  return (
    <div
      className="bg-white rounded-xl border border-slate mb-4 mt-1"
      style={{ padding: "18px 18px 16px" }}
    >
      <p className="font-bold text-petrol text-[17px] mb-1">{title}</p>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Tag label={tag} />
        <span className="text-petrol-60 text-[13px]">{subtitle}</span>
      </div>
      <ProgressBar signed={signed} total={sections.length} h={8} />
    </div>
  );
}
