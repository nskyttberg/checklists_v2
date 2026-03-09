"use client";
// app/(admin)/admin/methods/page.tsx
// Lists all work_task rows with their competence_definition counts.
// Allows creating new methods and toggling active/inactive.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface WorkTask {
  id: string;
  name: string;
  type: string;
  category: string | null;
  active: boolean;
  competence_definition: { id: string }[];
}

// -------------------------------------------------
// Helpers
// -------------------------------------------------

const CATEGORY_ORDER = ["Hjärta", "Kärl", "Lungor", "Flyg&Dyk", "Adm", "Ej ackr"];

function sortedByCategory(tasks: WorkTask[]) {
  return [...tasks].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category ?? "");
    const bi = CATEGORY_ORDER.indexOf(b.category ?? "");
    const ac = ai === -1 ? 99 : ai;
    const bc = bi === -1 ? 99 : bi;
    if (ac !== bc) return ac - bc;
    return a.name.localeCompare(b.name, "sv");
  });
}

// -------------------------------------------------
// New method modal
// -------------------------------------------------

const WORK_TASK_TYPES = ["method", "medication", "work_mode"] as const;
const CATEGORIES      = ["Hjärta", "Kärl", "Lungor", "Flyg&Dyk", "Adm", "Ej ackr"];

function NewMethodModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName]         = useState("");
  const [type, setType]         = useState<string>("method");
  const [category, setCategory] = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function handleSave() {
    if (!name.trim()) { setError("Namn krävs."); return; }
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("work_task")
      .insert({ name: name.trim(), type, category: category || null, active: true });
    if (err) { setError(err.message); setSaving(false); return; }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-petrol/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-petrol mb-5">Ny metod</h2>

        <label className="block text-sm font-medium text-petrol mb-1">Namn</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="t.ex. Spirometri"
          className="w-full border border-slate rounded-lg bg-white text-petrol px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />

        <label className="block text-sm font-medium text-petrol mb-1">Typ</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-slate rounded-lg bg-white text-petrol px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="method">Metod</option>
          <option value="medication">Läkemedel</option>
          <option value="work_mode">Arbetssätt</option>
        </select>

        <label className="block text-sm font-medium text-petrol mb-1">Kategori</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-slate rounded-lg bg-white text-petrol px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="">Ingen kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-5 text-sm font-medium transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Sparar..." : "Skapa metod"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------
// Page
// -------------------------------------------------

export default function MethodsPage() {
  const [tasks, setTasks]         = useState<WorkTask[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter]       = useState("");

  async function fetchTasks() {
    const { data, error } = await supabase
      .from("work_task")
      .select("id, name, type, category, active, competence_definition ( id )")
      .order("name");
    if (!error) setTasks((data as unknown as WorkTask[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchTasks(); }, []);

  async function toggleActive(task: WorkTask) {
    await supabase
      .from("work_task")
      .update({ active: !task.active })
      .eq("id", task.id);
    fetchTasks();
  }

  const lowerFilter = filter.toLowerCase();
  const filtered = sortedByCategory(
    tasks.filter((t) =>
      !lowerFilter ||
      t.name.toLowerCase().includes(lowerFilter) ||
      (t.category ?? "").toLowerCase().includes(lowerFilter),
    ),
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, WorkTask[]>>((acc, t) => {
    const key = t.category || "Övrigt";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  if (loading) {
    return <div className="text-center py-16"><p className="text-petrol-60">Laddar...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-petrol">Metoder</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filtrera..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-slate rounded-lg bg-white text-petrol placeholder-petrol-60 focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm w-48"
          />
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-5 text-sm font-medium transition-colors"
          >
            + Ny metod
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, categoryTasks]) => (
          <div key={category}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-petrol-60 mb-2 px-1">
              {category}
            </h2>
            <div className="bg-white rounded-xl border border-slate overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate bg-cream">
                    <th className="text-left px-4 py-3 font-medium text-petrol-80">Metod</th>
                    <th className="text-left px-4 py-3 font-medium text-petrol-80">Typ</th>
                    <th className="text-left px-4 py-3 font-medium text-petrol-80">Behörighetsnivåer</th>
                    <th className="text-left px-4 py-3 font-medium text-petrol-80">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {categoryTasks.map((task) => (
                    <tr key={task.id} className="border-b border-slate/50 last:border-0">
                      <td className="px-4 py-3 font-medium text-petrol">
                        <Link
                          href={`/admin/methods/${task.id}`}
                          className="hover:text-accent transition-colors"
                        >
                          {task.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-petrol-60 capitalize">
                        {task.type === "method" ? "Metod" : task.type === "medication" ? "Läkemedel" : "Arbetssätt"}
                      </td>
                      <td className="px-4 py-3 text-petrol-60">
                        {task.competence_definition.length === 0 ? (
                          <span className="text-petrol-40 italic">Inga nivåer definierade</span>
                        ) : (
                          <span>{task.competence_definition.length} nivå{task.competence_definition.length !== 1 ? "er" : ""}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-petrol-20 text-petrol-60">
                            Inaktiv
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/methods/${task.id}`}
                            className="text-xs text-petrol-60 hover:text-petrol transition-colors px-2 py-1 rounded hover:bg-cream"
                          >
                            Hantera nivåer →
                          </Link>
                          <button
                            onClick={() => toggleActive(task)}
                            className="text-xs text-petrol-60 hover:text-petrol transition-colors px-2 py-1 rounded hover:bg-cream"
                          >
                            {task.active ? "Inaktivera" : "Aktivera"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate p-8 text-center">
            <p className="text-petrol-60">Inga metoder hittades.</p>
          </div>
        )}
      </div>

      {showModal && (
        <NewMethodModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchTasks(); }}
        />
      )}
    </div>
  );
}