"use client";
// lib/competence-picker.tsx
// Reusable competence picker. Two variants:
//   mode="single"  — one selection, returns CompetenceSelection | null via onChange
//   mode="multi"   — multiple selections with chips, returns CompetenceSelection[] via onChange

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCompetence, formatCompetenceShort } from "@/lib/format";

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

// ── Variant props ─────────────────────────────────────────────────────────────

interface SinglePickerProps {
  mode: "single";
  value: CompetenceSelection | null;
  onChange: (value: CompetenceSelection | null) => void;
  label?: string;
}

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("work_task")
        .select("id, name, category")
        .eq("active", true)
        .order("name");
      if (error) setError("Kunde inte ladda metoder");
      else setWorkTasks(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedTaskId) { setDefinitions([]); return; }
    async function load() {
      const { data } = await supabase
        .from("competence_definition")
        .select("id, work_task_id, display_name, competence_type, level")
        .eq("work_task_id", selectedTaskId)
        .order("competence_type")
        .order("level");
      setDefinitions(data ?? []);
    }
    load();
  }, [selectedTaskId]);

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
      if (!current.some((s) => s.competence_definition_id === defId)) {
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
      {label && <p className="text-[13px] font-medium text-petrol">{label}</p>}

      <div className="flex gap-3">
        {/* Work task */}
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
            <option key={wt.id} value={wt.id}>{wt.name}</option>
          ))}
        </select>

        {/* Competence definition — Nivå N · Typ · Namn */}
        <select
          value={mode === "single" && singleValue ? singleValue.competence_definition_id : ""}
          onChange={(e) => handleDefinitionChange(e.target.value)}
          disabled={!selectedTaskId || definitions.length === 0}
          className="flex-1 h-10 rounded-lg border border-slate bg-white px-3 text-[13px] text-petrol focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {!selectedTaskId ? "Välj metod först" : definitions.length === 0 ? "Inga behörigheter hittades" : "Välj behörighet..."}
          </option>
          {definitions.map((cd) => (
            <option key={cd.id} value={cd.id}>
              {formatCompetence(cd.level, cd.competence_type, cd.display_name)}
            </option>
          ))}
        </select>
      </div>

      {/* Single chip — Metod · Nivå N · Typ */}
      {mode === "single" && singleValue && (
        <div className="flex items-center gap-2">
          <Chip
            label={`${singleValue.work_task_name} · ${formatCompetenceShort(singleValue.level, singleValue.competence_type)}`}
            onRemove={() => (props as SinglePickerProps).onChange(null)}
          />
        </div>
      )}

      {/* Multi chips — Metod · Nivå N · Typ */}
      {mode === "multi" && multiValue.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {multiValue.map((s) => (
            <Chip
              key={s.competence_definition_id}
              label={`${s.work_task_name} · ${formatCompetenceShort(s.level, s.competence_type)}`}
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
        className="hover:text-petrol-80 transition-colors leading-none"
        aria-label="Ta bort"
      >
        ×
      </button>
    </span>
  );
}