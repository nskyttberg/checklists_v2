"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CompetencePicker, CompetenceSelection } from "@/lib/competence-picker";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface SectionDraft {
  key: string;
  title: string;         // schema v3: title (not heading_text)
  items: ItemDraft[];
}

interface ItemDraft {
  key: string;
  text: string;          // schema v3: text (not item_text)
}

// -------------------------------------------------
// Helpers
// -------------------------------------------------

let keyCounter = 0;
function nextKey() { return `k_${++keyCounter}_${Date.now()}`; }
function emptySection(): SectionDraft { return { key: nextKey(), title: "", items: [emptyItem()] }; }
function emptyItem(): ItemDraft { return { key: nextKey(), text: "" }; }

// -------------------------------------------------
// Page
// -------------------------------------------------

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections]       = useState<SectionDraft[]>([]);
  const [competences, setCompetences] = useState<CompetenceSelection[]>([]);

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
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

      if (tplErr || !tpl) { setLoading(false); return; }

      if (tpl.status !== "draft") { setNotDraft(true); setLoading(false); return; }

      setName(tpl.name);
      setDescription(tpl.description || "");

      // Sections + items — schema v3: title, text
      const { data: secs } = await supabase
        .from("template_section")
        .select("id, title, sort_order, template_item ( id, text, sort_order )")
        .eq("template_id", templateId)
        .order("sort_order");

      if (secs) {
        const mapped: SectionDraft[] = (secs as unknown as Array<{
          id: string; title: string; sort_order: number;
          template_item: Array<{ id: string; text: string; sort_order: number }>;
        }>).map((s) => ({
          key: nextKey(),
          title: s.title,
          items: [...(s.template_item || [])]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((i) => ({ key: nextKey(), text: i.text })),
        }));
        setSections(mapped.length > 0 ? mapped : [emptySection()]);
      }

      // Competence links — schema v3: template_competence
      const { data: links } = await supabase
        .from("template_competence")
        .select(`
          competence_definition_id,
          competence_definition:competence_definition_id (
            id, display_name, competence_type, level,
            work_task:work_task_id ( id, name )
          )
        `)
        .eq("template_id", templateId);

      if (links) {
        // Rebuild CompetenceSelection objects so the picker shows existing chips
        const selections: CompetenceSelection[] = (links as unknown as Array<{
          competence_definition_id: string;
          competence_definition: {
            id: string; display_name: string; competence_type: string; level: number;
            work_task: { id: string; name: string };
          };
        }>).map((l) => ({
          competence_definition_id: l.competence_definition_id,
          work_task_id:   l.competence_definition.work_task.id,
          work_task_name: l.competence_definition.work_task.name,
          display_name:   l.competence_definition.display_name,
          competence_type: l.competence_definition.competence_type,
          level:           l.competence_definition.level,
        }));
        setCompetences(selections);
      }

      setLoading(false);
    }
    fetchData();
  }, [templateId]);

  // -------------------------------------------------
  // Section / item helpers
  // -------------------------------------------------

  function updateSectionTitle(key: string, value: string) {
    setSections((prev) => prev.map((s) => s.key === key ? { ...s, title: value } : s));
  }

  function addSection() { setSections((prev) => [...prev, emptySection()]); }

  function removeSection(key: string) { setSections((prev) => prev.filter((s) => s.key !== key)); }

  function moveSectionUp(index: number) {
    if (index === 0) return;
    setSections((prev) => { const c = [...prev]; [c[index - 1], c[index]] = [c[index], c[index - 1]]; return c; });
  }

  function moveSectionDown(index: number) {
    setSections((prev) => {
      if (index >= prev.length - 1) return prev;
      const c = [...prev]; [c[index], c[index + 1]] = [c[index + 1], c[index]]; return c;
    });
  }

  function addItem(sectionKey: string) {
    setSections((prev) => prev.map((s) => s.key === sectionKey ? { ...s, items: [...s.items, emptyItem()] } : s));
  }

  function updateItem(sectionKey: string, itemKey: string, value: string) {
    setSections((prev) => prev.map((s) =>
      s.key === sectionKey
        ? { ...s, items: s.items.map((i) => i.key === itemKey ? { ...i, text: value } : i) }
        : s
    ));
  }

  function removeItem(sectionKey: string, itemKey: string) {
    setSections((prev) => prev.map((s) =>
      s.key === sectionKey ? { ...s, items: s.items.filter((i) => i.key !== itemKey) } : s
    ));
  }

  // -------------------------------------------------
  // Validate
  // -------------------------------------------------

  function validate(): string | null {
    if (name.trim().length < 3) return "Namn måste vara minst 3 tecken.";
    if (sections.length === 0) return "Lägg till minst en rubrik.";
    for (let i = 0; i < sections.length; i++) {
      if (!sections[i].title.trim()) return `Rubrik ${i + 1} saknar text.`;
    }
    return null;
  }

  // -------------------------------------------------
  // Save — delete-and-recreate strategy, schema v3 field names
  // -------------------------------------------------

  async function handleSave() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError("");

    try {
      // Update template metadata
      const { error: tplErr } = await supabase
        .from("checklist_template")
        .update({ name: name.trim(), description: description.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", templateId);
      if (tplErr) throw new Error(`Mall: ${tplErr.message}`);

      // Delete existing sections (cascades to template_item)
      const { error: delSecErr } = await supabase
        .from("template_section").delete().eq("template_id", templateId);
      if (delSecErr) throw new Error(`Radera rubriker: ${delSecErr.message}`);

      // Delete existing competence links — schema v3: template_competence
      const { error: delLinkErr } = await supabase
        .from("template_competence").delete().eq("template_id", templateId);
      if (delLinkErr) throw new Error(`Radera behörighetskopplingar: ${delLinkErr.message}`);

      // Re-insert sections + items with schema v3 field names
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx];
        if (!section.title.trim()) continue;

        const { data: sec, error: secErr } = await supabase
          .from("template_section")
          .insert({ template_id: templateId, title: section.title.trim(), sort_order: sIdx + 1 })
          .select("id")
          .single();
        if (secErr || !sec) throw new Error(`Rubrik ${sIdx + 1}: ${secErr?.message}`);

        const itemRows = section.items
          .filter((i) => i.text.trim())
          .map((item, iIdx) => ({ section_id: sec.id, text: item.text.trim(), sort_order: iIdx + 1 }));

        if (itemRows.length > 0) {
          const { error: itemErr } = await supabase.from("template_item").insert(itemRows);
          if (itemErr) throw new Error(`Moment i rubrik ${sIdx + 1}: ${itemErr.message}`);
        }
      }

      // Re-insert competence links — schema v3: template_competence
      if (competences.length > 0) {
        const { error: linkErr } = await supabase
          .from("template_competence")
          .insert(competences.map((c) => ({
            template_id: templateId,
            competence_definition_id: c.competence_definition_id,
          })));
        if (linkErr) throw new Error(`Behörighetskoppling: ${linkErr.message}`);
      }

      router.push(`/admin/templates/${templateId}`);
    } catch (err: unknown) {
      setError(`Kunde inte spara: ${err instanceof Error ? err.message : "Okänt fel"}`);
      setSaving(false);
    }
  }

  // -------------------------------------------------
  // Loading / guards
  // -------------------------------------------------

  if (loading) return <div className="text-center py-16"><p className="text-petrol-60">Laddar...</p></div>;

  if (notDraft) return (
    <div className="text-center py-16">
      <div className="bg-white rounded-xl border border-slate p-10 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-petrol">Kan inte redigeras</h1>
        <p className="text-petrol-60 mt-2 mb-6">
          Bara utkast kan redigeras. Publicerade mallar är låsta — skapa en ny version istället.
        </p>
        <Link href={`/admin/templates/${templateId}`} className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors">
          Tillbaka till mallen
        </Link>
      </div>
    </div>
  );

  // -------------------------------------------------
  // Render
  // -------------------------------------------------

  return (
    <div>
      <Link href={`/admin/templates/${templateId}`} className="text-sm text-petrol-80 hover:text-petrol mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Tillbaka till mallen
      </Link>

      <h1 className="text-xl font-bold text-petrol mb-6">Redigera utkast</h1>

      {/* Name & description */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-petrol mb-1">
            Namn <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate rounded-lg bg-white text-petrol placeholder:text-petrol-40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-petrol mb-1">Beskrivning</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-slate rounded-lg bg-white text-petrol placeholder:text-petrol-40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
          />
        </div>
      </div>

      {/* Competence picker — new API: mode/value/onChange */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-4">
        <p className="text-sm font-semibold text-petrol mb-3">Leder till behörighet</p>
        <CompetencePicker
          mode="multi"
          value={competences}
          onChange={setCompetences}
        />
      </div>

      {/* Sections & items */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-6">
        <h2 className="text-base font-bold text-petrol mb-4">Rubriker och moment</h2>
        <div className="space-y-4">
          {sections.map((section, sIdx) => (
            <div key={section.key} className="border border-slate/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-full bg-petrol-20 text-petrol flex items-center justify-center text-sm font-medium shrink-0">
                  {sIdx + 1}
                </span>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSectionTitle(section.key, e.target.value)}
                  placeholder="Rubriktext"
                  className="flex-1 border border-slate rounded-lg bg-white text-petrol placeholder:text-petrol-40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <button onClick={() => moveSectionUp(sIdx)} disabled={sIdx === 0}
                  className="p-1.5 text-petrol-40 hover:text-petrol disabled:opacity-30 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                </button>
                <button onClick={() => moveSectionDown(sIdx)} disabled={sIdx === sections.length - 1}
                  className="p-1.5 text-petrol-40 hover:text-petrol disabled:opacity-30 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>
                {sections.length > 1 && (
                  <button onClick={() => removeSection(section.key)}
                    className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>

              <div className="ml-9 space-y-2">
                {section.items.map((item, iIdx) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-petrol flex items-center justify-center text-xs font-medium shrink-0">
                      {iIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateItem(section.key, item.key, e.target.value)}
                      placeholder="Momenttext"
                      className="flex-1 border border-slate rounded-lg bg-white text-petrol placeholder:text-petrol-40 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    {section.items.length > 1 && (
                      <button onClick={() => removeItem(section.key, item.key)}
                        className="p-1 text-petrol-40 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => addItem(section.key)}
                  className="text-sm text-accent hover:text-accent/80 font-medium transition-colors mt-1">
                  + Lägg till moment
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addSection}
          className="mt-4 text-sm text-petrol border border-slate rounded-lg px-4 py-2 hover:bg-sand transition-colors">
          + Lägg till rubrik
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href={`/admin/templates/${templateId}`}
          className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-6 text-sm font-medium transition-colors">
          Avbryt
        </Link>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? "Sparar..." : "Spara ändringar"}
        </button>
      </div>
    </div>
  );
}