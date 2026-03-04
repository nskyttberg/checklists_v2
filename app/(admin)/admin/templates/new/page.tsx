"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { CompetencePicker } from "@/lib/competence-picker";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface SectionDraft {
  key: string;
  heading_text: string;
  items: ItemDraft[];
}

interface ItemDraft {
  key: string;
  item_text: string;
}

// -------------------------------------------------
// Helpers
// -------------------------------------------------

let keyCounter = 0;
function nextKey() {
  return `k_${++keyCounter}_${Date.now()}`;
}

function emptySection(): SectionDraft {
  return { key: nextKey(), heading_text: "", items: [emptyItem()] };
}

function emptyItem(): ItemDraft {
  return { key: nextKey(), item_text: "" };
}

// -------------------------------------------------
// Page
// -------------------------------------------------

export default function NewTemplatePage() {
  const router = useRouter();
  const { currentUser } = useUser();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionDraft[]>([emptySection()]);
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // -------------------------------------------------
  // Section/item manipulation
  // -------------------------------------------------

  function updateSection(key: string, field: string, value: string) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, [field]: value } : s))
    );
  }

  function addSection() {
    setSections((prev) => [...prev, emptySection()]);
  }

  function removeSection(key: string) {
    setSections((prev) => prev.filter((s) => s.key !== key));
  }

  function addItem(sectionKey: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.key === sectionKey ? { ...s, items: [...s.items, emptyItem()] } : s
      )
    );
  }

  function updateItem(sectionKey: string, itemKey: string, value: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.key === sectionKey
          ? {
              ...s,
              items: s.items.map((i) =>
                i.key === itemKey ? { ...i, item_text: value } : i
              ),
            }
          : s
      )
    );
  }

  function removeItem(sectionKey: string, itemKey: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.key === sectionKey
          ? { ...s, items: s.items.filter((i) => i.key !== itemKey) }
          : s
      )
    );
  }

  function moveSectionUp(index: number) {
    if (index === 0) return;
    setSections((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  }

  function moveSectionDown(index: number) {
    setSections((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  }

  // -------------------------------------------------
  // Validate
  // -------------------------------------------------

  function validate(): string | null {
    if (name.trim().length < 3) return "Namn mÃƒÂ¥ste vara minst 3 tecken.";
    if (sections.length === 0) return "LÃƒÂ¤gg till minst en rubrik.";
    for (let i = 0; i < sections.length; i++) {
      if (!sections[i].heading_text.trim()) {
        return `Rubrik ${i + 1} saknar text.`;
      }
      for (let j = 0; j < sections[i].items.length; j++) {
        if (!sections[i].items[j].item_text.trim()) {
          return `Rubrik ${i + 1}, moment ${j + 1} saknar text.`;
        }
      }
    }
    return null;
  }

  // -------------------------------------------------
  // Save
  // -------------------------------------------------

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: tpl, error: tplErr } = await supabase
        .from("checklist_template")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          version: 1,
          status: "draft",
          active: true,
          created_by: currentUser?.id || null,
        })
        .select("id")
        .single();

      if (tplErr) throw new Error(`Mall: ${tplErr.message}`);
      const templateId = tpl.id;

      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx];
        const { data: sec, error: secErr } = await supabase
          .from("template_section")
          .insert({
            template_id: templateId,
            heading_text: section.heading_text.trim(),
            sort_order: sIdx + 1,
          })
          .select("id")
          .single();

        if (secErr) throw new Error(`Rubrik ${sIdx + 1}: ${secErr.message}`);

        if (section.items.length > 0) {
          const itemRows = section.items
            .filter((i) => i.item_text.trim())
            .map((item, iIdx) => ({
              section_id: sec.id,
              item_text: item.item_text.trim(),
              sort_order: iIdx + 1,
            }));

          if (itemRows.length > 0) {
            const { error: itemErr } = await supabase
              .from("template_item")
              .insert(itemRows);
            if (itemErr)
              throw new Error(`Moment i rubrik ${sIdx + 1}: ${itemErr.message}`);
          }
        }
      }

      if (selectedCompetences.length > 0) {
        const linkRows = selectedCompetences.map((compId) => ({
          template_id: templateId,
          competence_definition_id: compId,
        }));
        const { error: linkErr } = await supabase
          .from("checklist_template_competence")
          .insert(linkRows);
        if (linkErr) throw new Error(`BehÃƒÂ¶righetskoppling: ${linkErr.message}`);
      }

      router.push(`/admin/templates/${templateId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OkÃƒÂ¤nt fel";
      setError(`Kunde inte spara: ${message}`);
      setSaving(false);
    }
  }

  // -------------------------------------------------
  // Render
  // -------------------------------------------------

  return (
    <div>
      <Link
        href="/admin/templates"
        className="text-sm text-petrol-80 hover:text-petrol mb-4 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Tillbaka till mallar
      </Link>

      <h1 className="text-xl font-bold text-petrol mb-6">Skapa ny mall</h1>

      {/* Name & description */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-petrol mb-1">
            Namn <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="T.ex. UpplÃƒÂ¤rning arbetsprov"
            className="w-full border border-slate rounded-lg bg-white text-petrol placeholder-petrol-60 focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-petrol mb-1">
            Beskrivning
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Valfri beskrivning av mallen"
            rows={2}
            className="w-full border border-slate rounded-lg bg-white text-petrol placeholder-petrol-60 focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Competence picker */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-6">
        <CompetencePicker
          selected={selectedCompetences}
          onChange={setSelectedCompetences}
        />
      </div>

      {/* Sections & items */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-6">
        <h2 className="text-base font-bold text-petrol mb-4">
          Rubriker och moment
        </h2>

        <div className="space-y-5">
          {sections.map((section, sIdx) => (
            <div key={section.key} className="border border-slate/50 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <span className="w-7 h-7 rounded-full bg-petrol-20 text-petrol flex items-center justify-center text-sm font-medium shrink-0 mt-1">
                  {sIdx + 1}
                </span>
                <input
                  type="text"
                  value={section.heading_text}
                  onChange={(e) => updateSection(section.key, "heading_text", e.target.value)}
                  placeholder="Rubriktext"
                  className="flex-1 border border-slate rounded-lg bg-white text-petrol placeholder-petrol-60 focus:ring-petrol-60 focus:border-petrol-60 px-3 py-2 text-sm font-medium"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => moveSectionUp(sIdx)} disabled={sIdx === 0} className="p-1.5 text-petrol-60 hover:text-petrol disabled:opacity-30" title="Flytta upp">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                  </button>
                  <button type="button" onClick={() => moveSectionDown(sIdx)} disabled={sIdx === sections.length - 1} className="p-1.5 text-petrol-60 hover:text-petrol disabled:opacity-30" title="Flytta ner">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  {sections.length > 1 && (
                    <button type="button" onClick={() => removeSection(section.key)} className="p-1.5 text-error hover:bg-error-light rounded" title="Ta bort rubrik">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="ml-9 space-y-2">
                {section.items.map((item, iIdx) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent-40 text-petrol flex items-center justify-center text-xs font-medium shrink-0">
                      {iIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.item_text}
                      onChange={(e) => updateItem(section.key, item.key, e.target.value)}
                      placeholder="Momenttext"
                      className="flex-1 border border-slate rounded-lg bg-white text-petrol placeholder-petrol-60 focus:ring-petrol-60 focus:border-petrol-60 px-3 py-1.5 text-sm"
                    />
                    <button type="button" onClick={() => removeItem(section.key, item.key)} className="p-1 text-petrol-40 hover:text-error" title="Ta bort moment">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addItem(section.key)} className="text-sm text-petrol-80 hover:text-petrol mt-1">
                  + LÃƒÂ¤gg till moment
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addSection} className="mt-4 inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-5 text-sm font-medium transition-colors">
          + LÃƒÂ¤gg till rubrik
        </button>
      </div>

      {error && (
        <div className="bg-error-light border border-error/20 rounded-xl text-error text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/admin/templates" className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-6 text-sm font-medium transition-colors">
          Avbryt
        </Link>
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? "Sparar..." : "Spara utkast"}
        </button>
      </div>
    </div>
  );
}


