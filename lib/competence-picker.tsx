"use client";
// lib/competence-picker.tsx
// Reusable competence picker. Two variants:
//   mode="single"  — one selection, returns CompetenceSelection | null via onChange
//   mode="multi"   — multiple selections with chips, returns CompetenceSelection[] via onChange
//
// Reads: work_task + competence_definition from schema v3

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompetenceSelection {
  competence_definition_id: string;
  work_task_id: string;
  work_task_name: string;
  display_name: string;
  competence_type: string;
  level: number;
}

interface WorkTask {
  id: string;
  name: string;
  category: string | null;
}

interface CompetenceDefinition {
  id: string;
  work_task_id: string;
  display_name: string;
  competence_type: string;
  level: number;
}

// ── Label helpers ─────────────────────────────────────────────────────────────

const COMPETENCE_TYPE_LABELS: Record<string, string> = {
  examination:     "Undersökningsbehörighet",
  reporting:       "Svarsbehörighet",
  referral_review: "Remissgranskning",
  delegation:      "Delegering",
  remote_work:     "Distansarbete",
};

function competenceLabel(cd: CompetenceDefinition): string {
  const typeLabel = COMPETENCE_TYPE_LABELS[cd.competence_type] ?? cd.competence_type;
  return `${typeLabel} · ${cd.display_name}`;
}

// ── Single-select variant ─────────────────────────────────────────────────────

interface SinglePickerProps {
  mode: "single";
  value: CompetenceSelection | null;
  onChange: (value: CompetenceSelection | null) => void;
  label?: string;
}

// ── Multi-select variant ──────────────────────────────────────────────────────

interface MultiPickerProps {
  mode: "multi";
  value: CompetenceSelection[];
  onChange: (value: CompetenceSelection[]) => void;
  label?: string;
}

type CompetencePickerProps = SinglePickerProps | MultiPickerProps;

// ── Component ────────────────────────────────────────────────────────────────

export function CompetencePicker(props: CompetencePickerProps) {
  const { mode, label } = props;

  const [workTasks, setWorkTasks] = useState<WorkTask[]>([]);
  const [definitions, setDefinitions] = useState<CompetenceDefinition[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load work tasks on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("work_task")
        .select("id, name, category")
        .eq("active", true)
        .order("name");

      if (error) {
        setError("Kunde inte ladda metoder");
      } else {
        setWorkTasks(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load competence definitions when work task is selected
  useEffect(() => {
    if (!selectedTaskId) {
      setDefinitions([]);
      return;
    }
    async function load() {
      const { data, error } = await supabase
        .from("competence_definition")
        .select("id, work_task_id, display_name, competence_type, level")
        .eq("work_task_id", selectedTaskId)
        .order("competence_type")
        .order("level");

      if (!error) setDefinitions(data ?? []);
    }
    load();
  }, [selectedTaskId]);

  // Build a CompetenceSelection from a definition id
  function buildSelection(defId: string): CompetenceSelection | null {
    const cd = definitions.find((d) => d.id === defId);
    const wt = workTasks.find((w) => w.id === selectedTaskId);
    if (!cd || !wt) return null;
    return {
      competence_definition_id: cd.id,
      work_task_id: wt.id,
      work_task_name: wt.name,
      display_name: cd.display_name,
      competence_type: cd.competence_type,
      level: cd.level,
    };
  }

  function handleDefinitionChange(defId: string) {
    if (!defId) return;
    const selection = buildSelection(defId);
    if (!selection) return;

    if (mode === "single") {
      (props as SinglePickerProps).onChange(selection);
    } else {
      const current = (props as MultiPickerProps).value;
      const alreadyAdded = current.some(
        (s) => s.competence_definition_id === defId
      );
      if (!alreadyAdded) {
        (props as MultiPickerProps).onChange([...current, selection]);
      }
    }
  }

  function removeChip(defId: string) {
    if (mode !== "multi") return;
    const current = (props as MultiPickerProps).value;
    (props as MultiPickerProps).onChange(
      current.filter((s) => s.competence_definition_id !== defId)
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate bg-white p-4 text-[13px] text-petrol-60 animate-pulse">
        Laddar behörigheter...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-600">
        {error}
      </div>
    );
  }

  const singleValue = mode === "single" ? (props as SinglePickerProps).value : null;
  const multiValue  = mode === "multi"  ? (props as MultiPickerProps).value  : [];

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-[13px] font-medium text-petrol">{label}</p>
      )}

      {/* Row: work task + competence definition */}
      <div className="flex gap-3">
        {/* Work task dropdown */}
        <select
          value={selectedTaskId}
          onChange={(e) => {
            setSelectedTaskId(e.target.value);
            if (mode === "single") (props as SinglePickerProps).onChange(null);
          }}
          className="flex-1 h-10 rounded-lg border border-slate bg-white px-3 text-[13px] text-petrol focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="">Välj metod...</option>
          {workTasks.map((wt) => (
            <option key={wt.id} value={wt.id}>
              {wt.name}
            </option>
          ))}
        </select>

        {/* Competence definition dropdown */}
        <select
          value={
            mode === "single" && singleValue
              ? singleValue.competence_definition_id
              : ""
          }
          onChange={(e) => handleDefinitionChange(e.target.value)}
          disabled={!selectedTaskId || definitions.length === 0}
          className="flex-1 h-10 rounded-lg border border-slate bg-white px-3 text-[13px] text-petrol focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {!selectedTaskId
              ? "Välj metod först"
              : definitions.length === 0
              ? "Inga behörigheter hittades"
              : "Välj behörighet..."}
          </option>
          {definitions.map((cd) => (
            <option key={cd.id} value={cd.id}>
              {competenceLabel(cd)}
            </option>
          ))}
        </select>
      </div>

      {/* Single-select: show selected as a small tag */}
      {mode === "single" && singleValue && (
        <div className="flex items-center gap-2">
          <Chip
            label={`${singleValue.work_task_name} · ${COMPETENCE_TYPE_LABELS[singleValue.competence_type] ?? singleValue.competence_type}`}
            onRemove={() => (props as SinglePickerProps).onChange(null)}
          />
        </div>
      )}

      {/* Multi-select: chips */}
      {mode === "multi" && multiValue.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {multiValue.map((s) => (
            <Chip
              key={s.competence_definition_id}
              label={`${s.work_task_name} · ${COMPETENCE_TYPE_LABELS[s.competence_type] ?? s.competence_type}`}
              onRemove={() => removeChip(s.competence_definition_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-petrol/10 text-petrol text-[12px] font-medium px-2.5 py-1 rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-petrol/20 transition-colors"
        aria-label="Ta bort"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}