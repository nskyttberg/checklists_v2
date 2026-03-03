"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// -------------------------------------------------
// Types
// -------------------------------------------------

export interface CompetenceDef {
  id: string;
  display_name: string;
  competence_type: string;
  level: number;
  work_task_id: string;
  work_task: { id: string; name: string; category: string | null };
}

interface CompetencePickerProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

// -------------------------------------------------
// Helpers
// -------------------------------------------------

function competenceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    examination: "Undersökning",
    reporting: "Svar",
    referral_review: "Remissgranskning",
    delegation: "Delegering",
    remote_work: "Distansarbete",
  };
  return map[type] || type;
}

function groupByCategory(
  comps: CompetenceDef[]
): Record<string, Record<string, CompetenceDef[]>> {
  const result: Record<string, Record<string, CompetenceDef[]>> = {};
  comps.forEach((c) => {
    const cat = c.work_task?.category || "Övrigt";
    const task = c.work_task?.name || "Okänd";
    if (!result[cat]) result[cat] = {};
    if (!result[cat][task]) result[cat][task] = [];
    result[cat][task].push(c);
  });
  return result;
}

// -------------------------------------------------
// Component
// -------------------------------------------------

export function CompetencePicker({ selected, onChange }: CompetencePickerProps) {
  const [allCompetences, setAllCompetences] = useState<CompetenceDef[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch competence definitions
  useEffect(() => {
    async function fetchCompetences() {
      const { data } = await supabase
        .from("competence_definition")
        .select(
          "id, display_name, competence_type, level, work_task_id, work_task:work_task_id ( id, name, category )"
        )
        .order("level");

      if (data) setAllCompetences(data as unknown as CompetenceDef[]);
    }
    fetchCompetences();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  function addCompetence(id: string) {
    if (!selected.includes(id)) {
      onChange([...selected, id]);
    }
    setIsOpen(false);
  }

  function removeCompetence(id: string) {
    onChange(selected.filter((s) => s !== id));
  }

  const selectedItems = allCompetences.filter((c) => selected.includes(c.id));
  const availableItems = allCompetences.filter((c) => !selected.includes(c.id));
  const availableGrouped = groupByCategory(availableItems);

  return (
    <div>
      <h2 className="text-base font-bold text-petrol mb-1">
        Leder till behörighet
      </h2>
      <p className="text-sm text-petrol-60 mb-4">
        Välj vilka behörigheter som uppnås när checklistan är slutförd.
      </p>

      {/* Selected tags */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 bg-cream border border-petrol-40 rounded-lg px-2.5 py-1 text-sm"
            >
              <span className="font-medium text-petrol">
                {item.work_task?.name}
              </span>
              <span className="text-slate">·</span>
              <span className="text-petrol-80">
                {competenceTypeLabel(item.competence_type)}
              </span>
              <span className="text-slate">·</span>
              <span className="text-petrol-80">{item.display_name}</span>
              <button
                type="button"
                onClick={() => removeCompetence(item.id)}
                className="ml-0.5 text-petrol-40 hover:text-error transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between border rounded-lg bg-white px-3 py-2 text-sm min-h-[44px] transition-colors ${
            isOpen
              ? "border-petrol-60 text-petrol"
              : "border-slate text-petrol-60"
          }`}
        >
          <span>Lägg till behörighet...</span>
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate rounded-xl shadow-xl max-h-80 overflow-y-auto z-50">
            {Object.keys(availableGrouped).length === 0 ? (
              <div className="px-4 py-6 text-center text-petrol-60 text-sm">
                Alla behörigheter är valda
              </div>
            ) : (
              Object.entries(availableGrouped).map(([category, tasks]) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-petrol-60 uppercase tracking-wider bg-cream border-b border-sand">
                    {category}
                  </div>
                  {/* Items */}
                  {Object.entries(tasks).map(([taskName, comps]) =>
                    (comps as CompetenceDef[]).map((comp) => (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => addCompetence(comp.id)}
                        className="w-full flex items-center gap-1.5 px-3 py-2.5 text-sm text-left border-b border-sand/50 hover:bg-cream transition-colors"
                      >
                        <span className="font-medium text-petrol">
                          {taskName}
                        </span>
                        <span className="text-slate">·</span>
                        <span className="text-petrol-80">
                          {competenceTypeLabel(comp.competence_type)}
                        </span>
                        <span className="text-slate">·</span>
                        <span className="text-petrol-80">
                          {comp.display_name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}