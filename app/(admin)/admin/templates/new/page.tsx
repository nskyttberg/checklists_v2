"use client";
// app/(admin)/admin/templates/new/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { CompetencePicker, CompetenceSelection } from "@/lib/competence-picker";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SectionDraft {
  id: string;          // local only
  title: string;
  items: ItemDraft[];
}

interface ItemDraft {
  id: string;          // local only
  text: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewTemplatePage() {
  const router = useRouter();
  const { currentUser } = useUser();

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [competences, setCompetences] = useState<CompetenceSelection[]>([]);
  const [sections, setSections]       = useState<SectionDraft[]>([newSection()]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // ── Section helpers ─────────────────────────────────────────────────────────

  function newSection(): SectionDraft {
    return { id: crypto.randomUUID(), title: "", items: [newItem()] };
  }

  function newItem(): ItemDraft {
    return { id: crypto.randomUUID(), text: "" };
  }

  function addSection() {
    setSections((prev) => [...prev, newSection()]);
  }

  function removeSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  function moveSectionUp(index: number) {
    if (index === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveSectionDown(index: number) {
    setSections((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function updateSectionTitle(sectionId: string, title: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
  }

  function addItem(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, items: [...s.items, newItem()] } : s
      )
    );
  }

  function removeItem(sectionId: string, itemId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
          : s
      )
    );
  }

  function updateItemText(sectionId: string, itemId: string, text: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((i) =>
                i.id === itemId ? { ...i, text } : i
              ),
            }
          : s
      )
    );
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Namn krävs.");
      return;
    }

    setSaving(true);
    try {
      // 1. Create template
      const { data: tmpl, error: tmplErr } = await supabase
        .from("checklist_template")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          version: 1,
          status: "draft",
          created_by: currentUser?.id ?? null,
        })
        .select("id")
        .single();

      if (tmplErr || !tmpl) throw new Error(tmplErr?.message ?? "Failed to create template");

      const templateId = tmpl.id;

      // 2. Insert sections + items
      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        if (!sec.title.trim()) continue;

        const { data: secRow, error: secErr } = await supabase
          .from("template_section")
          .insert({
            template_id: templateId,
            title: sec.title.trim(),
            sort_order: si + 1,
          })
          .select("id")
          .single();

        if (secErr || !secRow) throw new Error(secErr?.message ?? "Failed to insert section");

        const items = sec.items.filter((i) => i.text.trim());
        if (items.length > 0) {
          const { error: itemErr } = await supabase.from("template_item").insert(
            items.map((item, ii) => ({
              section_id: secRow.id,
              text: item.text.trim(),
              sort_order: ii + 1,
            }))
          );
          if (itemErr) throw new Error(itemErr.message);
        }
      }

      // 3. Link competence definitions
      if (competences.length > 0) {
        const { error: compErr } = await supabase.from("template_competence").insert(
          competences.map((c) => ({
            template_id: templateId,
            competence_definition_id: c.competence_definition_id,
          }))
        );
        if (compErr) throw new Error(compErr.message);
      }

      router.push(`/admin/templates/${templateId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Okant fel");
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/admin/templates"
        className="inline-flex items-center gap-1.5 text-[13px] text-petrol-60 hover:text-petrol mb-5 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Tillbaka till mallar
      </Link>

      <h1 className="text-[22px] font-bold text-petrol mb-6">Skapa ny mall</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3">
          {error}
        </div>
      )}

      {/* Name + description */}
      <div className="bg-white rounded-2xl border border-slate p-5 space-y-4 mb-4">
        <div>
          <label className="block text-[13px] font-medium text-petrol mb-1.5">
            Namn <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="T.ex. Upplärning arbetsprov"
            className="w-full h-10 rounded-lg border border-slate px-3 text-[14px] text-petrol placeholder:text-petrol-40 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-petrol mb-1.5">
            Beskrivning
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Valfri beskrivning av mallen"
            rows={3}
            className="w-full rounded-lg border border-slate px-3 py-2.5 text-[14px] text-petrol placeholder:text-petrol-40 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
          />
        </div>
      </div>

      {/* Competence picker */}
      <div className="bg-white rounded-2xl border border-slate p-5 mb-4">
        <p className="text-[13px] font-semibold text-petrol mb-3">Leder till behörighet</p>
        <CompetencePicker
          mode="multi"
          value={competences}
          onChange={setCompetences}
          label="Lagg till en eller flera behorigheter som mallen ger"
        />
      </div>

      {/* Sections */}
      <div className="bg-white rounded-2xl border border-slate p-5 mb-6">
        <p className="text-[13px] font-semibold text-petrol mb-4">Rubriker och moment</p>

        <div className="space-y-4">
          {sections.map((sec, si) => (
            <div key={sec.id} className="border border-slate rounded-xl p-4">
              {/* Section header row */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-petrol text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {si + 1}
                </span>
                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) => updateSectionTitle(sec.id, e.target.value)}
                  placeholder="Rubriktext"
                  className="flex-1 h-9 rounded-lg border border-slate px-3 text-[13px] text-petrol placeholder:text-petrol-40 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                {/* Move up/down */}
                <button
                  onClick={() => moveSectionUp(si)}
                  disabled={si === 0}
                  className="p-1 text-petrol-40 hover:text-petrol disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Flytta upp"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 9l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => moveSectionDown(si)}
                  disabled={si === sections.length - 1}
                  className="p-1 text-petrol-40 hover:text-petrol disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Flytta ned"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {/* Remove section */}
                {sections.length > 1 && (
                  <button
                    onClick={() => removeSection(sec.id)}
                    className="p-1 text-petrol-40 hover:text-red-500 transition-colors"
                    aria-label="Ta bort rubrik"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Items */}
              <div className="pl-8 space-y-2">
                {sec.items.map((item, ii) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {ii + 1}
                    </span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateItemText(sec.id, item.id, e.target.value)}
                      placeholder="Momenttext"
                      className="flex-1 h-8 rounded-lg border border-slate px-3 text-[13px] text-petrol placeholder:text-petrol-40 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    {sec.items.length > 1 && (
                      <button
                        onClick={() => removeItem(sec.id, item.id)}
                        className="p-1 text-petrol-40 hover:text-red-500 transition-colors"
                        aria-label="Ta bort moment"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addItem(sec.id)}
                  className="text-[12px] text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  + Lagg till moment
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addSection}
          className="mt-4 text-[13px] text-petrol border border-slate rounded-lg px-4 py-2 hover:bg-sand transition-colors"
        >
          + Lagg till rubrik
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.push("/admin/templates")}
          className="px-5 py-2.5 rounded-full border border-slate text-[13px] text-petrol hover:bg-sand transition-colors"
        >
          Avbryt
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-5 py-2.5 rounded-full bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Sparar..." : "Spara utkast"}
        </button>
      </div>
    </div>
  );
}