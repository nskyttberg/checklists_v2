"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../../lib/supabase";
import { useUser } from "../../../../../lib/user-context";
import { CompetencePicker } from "../../../../../lib/competence-picker";

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

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const { currentUser } = useUser();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notDraft, setNotDraft] = useState(false);

  // -------------------------------------------------
  // Fetch existing data
  // -------------------------------------------------

  useEffect(() => {
    async function fetchData() {
      const { data: tpl, error: tplErr } = await supabase
        .from("checklist_template")
        .select("*")
        .eq("id", templateId)
        .single();

      if (tplErr || !tpl) {
        setLoading(false);
        return;
      }

      if (tpl.status !== "draft") {
        setNotDraft(true);
        setLoading(false);
        return;
      }

      setName(tpl.name);
      setDescription(tpl.description || "");

      const { data: secs } = await supabase
        .from("template_section")
        .select("id, heading_text, sort_order, template_item ( id, item_text, sort_order )")
        .eq("template_id", templateId)
        .order("sort_order");

      if (secs) {
        const mapped: SectionDraft[] = (secs as unknown as Array<{
          id: string;
          heading_text: string;
          sort_order: number;
          template_item: Array<{ id: string; item_text: string; sort_order: number }>;
        }>).map((s) => ({
          key: nextKey(),
          heading_text: s.heading_text,
          items:
            [...(s.template_item || [])]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((i) => ({
                key: nextKey(),
                item_text: i.item_text,
              })),
        }));
        setSections(mapped.length > 0 ? mapped : [emptySection()]);
      }

      const { data: links } = await supabase
        .from("checklist_template_competence")
        .select("competence_definition_id")
        .eq("template_id", templateId);

      if (links) {
        setSelectedCompetences(links.map((l: { competence_definition_id: string }) => l.competence_definition_id));
      }

      setLoading(false);
    }

    fetchData();
  }, [templateId]);

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
    if (name.trim().length < 3) return "Namn måste vara minst 3 tecken.";
    if (sections.length === 0) return "Lägg till minst en rubrik.";
    for (let i = 0; i < sections.length; i++) {
      if (!sections[i].heading_text.trim()) return `Rubrik ${i + 1} saknar text.`;
      for (let j = 0; j < sections[i].items.length; j++) {
        if (!sections[i].items[j].item_text.trim()) return `Rubrik ${i + 1}, moment ${j + 1} saknar text.`;
      }
    }
    return null;
  }

  // -------------------------------------------------
  // Save — delete-and-recreate strategy
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
      const { error: tplErr } = await supabase
        .from("checklist_template")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);

      if (tplErr) throw new Error(`Mall: ${tplErr.message}`);

      const { error: delSecErr } = await supabase
        .from("template_section")
        .delete()
        .eq("template_id", templateId);
      if (delSecErr) throw new Error(`Radera rubriker: ${delSecErr.message}`);

      const { error: delLinkErr } = await supabase
        .from("checklist_template_competence")
        .delete()
        .eq("template_id", templateId);
      if (delLinkErr) throw new Error(`Radera behörighetskopplingar: ${delLinkErr.message}`);

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
            if (itemErr) throw new Error(`Moment i rubrik ${sIdx + 1}: ${itemErr.message}`);
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
        if (linkErr) throw new Error(`Behörighetskoppling: ${linkErr.message}`);
      }

      router.push(`/admin/templates/${templateId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Okänt fel";
      setError(`Kunde inte spara: ${message}`);
      setSaving(false);
    }
  }

  // -------------------------------------------------
  // Loading / guards
  // -------------------------------------------------

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Laddar...</p>
      </div>
    );
  }

  if (notDraft) {
    return (
      <div className="text-center py-16">
        <div className="bg-white rounded-xl border border-slate p-10 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-petrol">Kan inte redigeras</h1>
          <p className="text-petrol-60 mt-2 mb-6">
            Bara utkast kan redigeras. Publicerade mallar är låsta — skapa en ny version istället.
          </p>
          <Link
            href={`/admin/templates/${templateId}`}
            className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors"
          >
            Tillbaka till mallen
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------
  // Render
  // -------------------------------------------------

  return (
    <div>
      <Link
        href={`/admin/templates/${templateId}`}
        className="text-sm text-petrol-80 hover:text-petrol mb-4 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Tillbaka till mallen
      </Link>

      <h1 className="text-xl font-bold text-petrol mb-6">Redigera utkast</h1>

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
                  + Lägg till moment
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addSection} className="mt-4 inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-5 text-sm font-medium transition-colors">
          + Lägg till rubrik
        </button>
      </div>

      {error && (
        <div className="bg-error-light border border-error/20 rounded-xl text-error text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href={`/admin/templates/${templateId}`} className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-6 text-sm font-medium transition-colors">
          Avbryt
        </Link>
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? "Sparar..." : "Spara ändringar"}
        </button>
      </div>
    </div>
  );
}