"use client";
// app/(employee)/my/components/section-row.tsx

import { useState } from "react";
import type { SectionData } from "@/lib/queries/checklists";
import { Checkbox, ItemList, Icons, formatDate } from "./ui";

interface SectionRowProps {
  section: SectionData;
  mode: "trainee" | "supervisor";
  onSign?: () => void;
  onUnsign?: () => void;
}

export function SectionRow({ section: s, mode, onSign, onUnsign }: SectionRowProps) {
  const [expanded, setExpanded] = useState(false);

  const supOk     = !!s.signed_by_supervisor_id;
  const traineeOk = !!s.signed_by_trainee_id;

  // Trainee can sign their section in any order relative to supervisor
  const canSign = mode === "trainee" && !traineeOk;

  const supervisorLabel = s.signed_by_supervisor_name
    ? `${s.signed_by_supervisor_name} signerade`
    : "Handledare signerade";

  return (
    <div className="bg-white rounded-[10px] border border-slate overflow-hidden mb-2">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 cursor-pointer"
        style={{ padding: "12px 14px", minHeight: 56 }}
      >
        {mode === "trainee" ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-center" style={{ width: 36 }}>
              <Checkbox checked={supOk} disabled />
              <span className="text-[9px] text-petrol-60 mt-0.5">Handl.</span>
            </div>
            <div className="flex flex-col items-center" style={{ width: 36 }}>
              <Checkbox
                checked={traineeOk}
                disabled={!canSign}
                onClick={canSign ? onSign : undefined}
              />
              <span className="text-[9px] text-petrol-60 mt-0.5">Jag</span>
            </div>
          </div>
        ) : (
          <Checkbox checked={supOk} onClick={supOk ? onUnsign : onSign} />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-petrol text-sm font-medium">{s.title}</p>
        </div>

        <div
          className="text-petrol-60 shrink-0 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          {Icons.chevronDown()}
        </div>
      </div>

      {expanded && (
        <div
          className="border-t border-sand bg-cream"
          style={{
            padding: mode === "trainee" ? "10px 14px 12px" : "10px 16px 12px 60px",
          }}
        >
          <div style={mode === "trainee" ? { paddingLeft: 80 } : undefined}>
            <ItemList items={s.items} />

            {supOk && (
              <p className="text-success text-xs mb-0.5">
                {supervisorLabel} · {formatDate(s.signed_by_supervisor_at)}
              </p>
            )}
            {traineeOk && (
              <p className="text-success text-xs">
                {mode === "trainee" ? "Min signatur" : "Medarbetare signerade"} ·{" "}
                {formatDate(s.signed_by_trainee_at)}
              </p>
            )}
            {!supOk && !traineeOk && (
              <p className="text-petrol-60 text-xs">Ej signerad</p>
            )}

            {canSign && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSign?.();
                }}
                className="text-[13px] font-semibold text-white bg-accent rounded-3xl border-0 mt-2"
                style={{ padding: "10px 20px", cursor: "pointer", minHeight: 44 }}
              >
                Signera
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}