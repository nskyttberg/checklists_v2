"use client";
// app/(admin)/admin/methods/[id]/page.tsx

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { COMPETENCE_TYPE_LABELS } from "@/lib/format";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface WorkTask {
  id: string;
  name: string;
  type: string;
  category: string | null;
  active: boolean;
}

interface CompetenceDef {
  id: string;
  level: number;
  competence_type: string;
  display_name: string;
}

// -------------------------------------------------
// Fixed competence slots
// These are the only valid combinations in the system.
// examination 1 = Med läkarkontroll
// examination 2 = Självständigt
// reporting    3 = Normalsvar
// reporting    4 = Patologiska svar
// referral_review / delegation / remote_work = nivå 1 med fast namn
// -------------------------------------------------

interface Slot {
  competence_type: string;
  level: number;
  display_name: string;
}

const FIXED_SLOTS: Slot[] = [
  { competence_type: "examination",     level: 1, display_name: "Med läkarkontroll" },
  { competence_type: "examination",     level: 2, display_name: "Självständigt" },
  { competence_type: "reporting",       level: 3, display_name: "Normalsvar" },
  { competence_type: "reporting",       level: 4, display_name: "Patologiska svar" },
  { competence_type: "referral_review", level: 1, display_name: "Godkänd remissgranskare" },
  { competence_type: "delegation",      level: 1, display_name: "Delegering" },
  { competence_type: "remote_work",     level: 1, display_name: "Distansarbete" },
];

// -------------------------------------------------
// Helpers
// -------------------------------------------------

const CATEGORIES = ["Hjärta", "Kärl", "Lungor", "Flyg&Dyk", "Adm", "Ej ackr"];
const TYPE_ORDER = ["examination", "reporting", "referral_review", "delegation", "remote_work"];

function sortDefs(defs: CompetenceDef[]) {
  return [...defs].sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a.competence_type);
    const bi = TYPE_ORDER.indexOf(b.competence_type);
    if (ai !== bi) return ai - bi;
    return a.level - b.level;
  });
}

// -------------------------------------------------
// Add competence definition modal — slot picker
// -------------------------------------------------

function AddDefModal({
  workTaskId,
  existingDefs,
  onClose,
  onAdded,
}: {
  workTaskId: string;
  existingDefs: CompetenceDef[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  const availableSlots = FIXED_SLOTS.filter(
    (s) => !existingDefs.some(
      (d) => d.competence_type === s.competence_type && d.level === s.level,
    ),
  );

  async function handleSave() {
    if (!selectedSlot) { setError("Välj en nivå."); return; }
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("competence_definition")
      .insert({
        work_task_id:    workTaskId,
        competence_type: selectedSlot.competence_type,
        level:           selectedSlot.level,
        display_name:    selectedSlot.display_name,
      });
    if (err) { setError(err.message); setSaving(false); return; }
    onAdded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-petrol/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-petrol mb-2">Lägg till behörighetsnivå</h2>
        <p className="text-sm text-petrol-60 mb-5">
          Välj en av de standardiserade nivåerna att lägga till för denna metod.
        </p>

        {availableSlots.length === 0 ? (
          <div className="rounded-lg bg-cream border border-slate px-4 py-4 text-sm text-petrol-60 mb-5">
            Alla behörighetsnivåer är redan tillagda för denna metod.
          </div>
        ) : (
          <div className="space-y-2 mb-5">
            {availableSlots.map((slot) => {
              const selected =
                selectedSlot?.competence_type === slot.competence_type &&
                selectedSlot?.level === slot.level;
              return (
                <button
                  key={`${slot.competence_type}-${slot.level}`}
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selected
                      ? "border-accent bg-accent/5 text-petrol"
                      : "border-slate bg-white hover:bg-cream text-petrol"
                  }`}
                >
                  <span className="text-sm font-medium">
                    Nivå {slot.level} · {COMPETENCE_TYPE_LABELS[slot.competence_type]} · {slot.display_name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-5 text-sm font-medium transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedSlot || availableSlots.length === 0}
            className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Sparar..." : "Lägg till"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------
// Page
// -------------------------------------------------

export default function MethodDetailPage() {
  const params     = useParams();
  const workTaskId = params.id as string;

  const [task, setTask]             = useState<WorkTask | null>(null);
  const [defs, setDefs]             = useState<CompetenceDef[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAddDef, setShowAddDef] = useState(false);

  const [editing, setEditing]           = useState(false);
  const [editName, setEditName]         = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState("");

  const [confirmDeleteDef, setConfirmDeleteDef] = useState<CompetenceDef | null>(null);

  const fetchData = useCallback(async () => {
    const { data: wt } = await supabase
      .from("work_task")
      .select("id, name, type, category, active")
      .eq("id", workTaskId)
      .single();
    if (wt) {
      setTask(wt);
      setEditName(wt.name);
      setEditCategory(wt.category ?? "");
    }

    const { data: cd } = await supabase
      .from("competence_definition")
      .select("id, level, competence_type, display_name")
      .eq("work_task_id", workTaskId);
    if (cd) setDefs(sortDefs(cd as CompetenceDef[]));

    setLoading(false);
  }, [workTaskId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSaveMethod() {
    if (!editName.trim()) { setSaveError("Namn krävs."); return; }
    setSaving(true);
    setSaveError("");
    const { error } = await supabase
      .from("work_task")
      .update({ name: editName.trim(), category: editCategory || null })
      .eq("id", workTaskId);
    if (error) { setSaveError(error.message); setSaving(false); return; }
    setEditing(false);
    setSaving(false);
    fetchData();
  }

  async function handleToggleActive() {
    if (!task) return;
    await supabase.from("work_task").update({ active: !task.active }).eq("id", workTaskId);
    fetchData();
  }

  async function handleDeleteDef(def: CompetenceDef) {
    await supabase.from("competence_definition").delete().eq("id", def.id);
    setConfirmDeleteDef(null);
    fetchData();
  }

  if (loading) {
    return <div className="text-center py-16"><p className="text-petrol-60">Laddar...</p></div>;
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Metoden hittades inte.</p>
        <Link href="/admin/methods" className="text-petrol-80 hover:text-petrol mt-2 inline-block">
          Tillbaka till metoder
        </Link>
      </div>
    );
  }

  const grouped = defs.reduce<Record<string, CompetenceDef[]>>((acc, d) => {
    if (!acc[d.competence_type]) acc[d.competence_type] = [];
    acc[d.competence_type].push(d);
    return acc;
  }, {});

  return (
    <div>
      <Link
        href="/admin/methods"
        className="inline-flex items-center gap-1.5 text-petrol-60 hover:text-petrol text-sm mb-6 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Tillbaka till metoder
      </Link>

      {/* Method info card */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-6">
        {editing ? (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-petrol mb-1">Namn</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate rounded-lg bg-white text-petrol px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-petrol mb-1">Kategori</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full border border-slate rounded-lg bg-white text-petrol px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Ingen kategori</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSaveMethod}
                disabled={saving}
                className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[40px] px-5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Spara"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditName(task.name); setEditCategory(task.category ?? ""); }}
                className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[40px] px-5 text-sm font-medium transition-colors"
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-petrol">{task.name}</h1>
                {task.active ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">Aktiv</span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-petrol-20 text-petrol-60">Inaktiv</span>
                )}
              </div>
              <div className="flex gap-4 text-sm text-petrol-60">
                <span>Typ: {task.type === "method" ? "Metod" : task.type === "medication" ? "Läkemedel" : "Arbetssätt"}</span>
                {task.category && <span>Kategori: {task.category}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[40px] px-4 text-sm font-medium transition-colors"
              >
                Redigera
              </button>
              <button
                onClick={handleToggleActive}
                className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[40px] px-4 text-sm font-medium transition-colors"
              >
                {task.active ? "Inaktivera" : "Aktivera"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Competence definitions */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-petrol">Behörighetsnivåer</h2>
        <button
          onClick={() => setShowAddDef(true)}
          className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[40px] px-4 text-sm font-medium transition-colors"
        >
          + Lägg till nivå
        </button>
      </div>

      {defs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate p-8 text-center">
          <p className="text-petrol-60">Inga behörighetsnivåer definierade än.</p>
          <p className="text-petrol-40 text-sm mt-1">Klicka &quot;Lägg till nivå&quot; för att komma igång.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {TYPE_ORDER.filter((t) => grouped[t]).map((compType) => (
            <div key={compType} className="bg-white rounded-xl border border-slate overflow-hidden">
              <div className="px-4 py-2.5 bg-cream border-b border-slate">
                <span className="text-xs font-bold uppercase tracking-widest text-petrol-60">
                  {COMPETENCE_TYPE_LABELS[compType]}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {grouped[compType].map((def) => (
                    <tr key={def.id} className="border-b border-slate/50 last:border-0">
                      <td className="px-4 py-3 w-20 text-petrol-40 font-medium tabular-nums">Nivå {def.level}</td>
                      <td className="px-4 py-3 font-medium text-petrol">{def.display_name}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirmDeleteDef(def)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showAddDef && (
        <AddDefModal
          workTaskId={workTaskId}
          existingDefs={defs}
          onClose={() => setShowAddDef(false)}
          onAdded={() => { setShowAddDef(false); fetchData(); }}
        />
      )}

      {confirmDeleteDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-petrol/30" onClick={() => setConfirmDeleteDef(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-bold text-petrol mb-2">Ta bort behörighetsnivå?</h2>
            <p className="text-sm text-petrol-60 mb-5">
              <span className="font-medium text-petrol">
                Nivå {confirmDeleteDef.level} · {COMPETENCE_TYPE_LABELS[confirmDeleteDef.competence_type]} · {confirmDeleteDef.display_name}
              </span>
              {" "}tas bort permanent. Mallar som pekar på denna nivå kan påverkas.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteDef(null)}
                className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-5 text-sm font-medium transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => handleDeleteDef(confirmDeleteDef)}
                className="inline-flex items-center justify-center bg-red-500 text-white rounded-3xl hover:bg-red-600 min-h-[44px] px-5 text-sm font-medium transition-colors"
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}