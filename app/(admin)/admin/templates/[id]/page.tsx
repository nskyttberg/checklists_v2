"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../@/lib/supabase";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface TemplateItem {
  id: string;
  item_text: string;
  sort_order: number;
}

interface TemplateSection {
  id: string;
  heading_text: string;
  sort_order: number;
  template_item: TemplateItem[];
}

interface CompetenceLink {
  id: string;
  competence_definition: {
    id: string;
    display_name: string;
    competence_type: string;
    level: number;
    work_task: { id: string; name: string; category: string | null };
  };
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: "draft" | "published";
  active: boolean;
  created_at: string;
  published_at: string | null;
  created_by: string | null;
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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sv-SE");
}

function statusBadge(status: string, active: boolean) {
  if (status === "published" && active) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">
        Publicerad
      </span>
    );
  }
  if (status === "published" && !active) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-petrol-20 text-petrol-60">
        Inaktiv
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">
      Utkast
    </span>
  );
}

// -------------------------------------------------
// Page
// -------------------------------------------------

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [competenceLinks, setCompetenceLinks] = useState<CompetenceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Template
      const { data: tpl, error: tplErr } = await supabase
        .from("checklist_template")
        .select("*")
        .eq("id", templateId)
        .single();

      if (tplErr) {
        console.error("Failed to fetch template:", tplErr.message);
        setLoading(false);
        return;
      }
      setTemplate(tpl);

      // Sections with items
      const { data: secs, error: secErr } = await supabase
        .from("template_section")
        .select("id, heading_text, sort_order, template_item ( id, item_text, sort_order )")
        .eq("template_id", templateId)
        .order("sort_order");

      if (!secErr && secs) {
        const sorted = (secs as unknown as TemplateSection[]).map((s) => ({
          ...s,
          template_item: [...(s.template_item || [])].sort(
            (a, b) => a.sort_order - b.sort_order
          ),
        }));
        setSections(sorted);
      }

      // Competence links
      const { data: links, error: linkErr } = await supabase
        .from("checklist_template_competence")
        .select(
          `
          id,
          competence_definition:competence_definition_id (
            id,
            display_name,
            competence_type,
            level,
            work_task:work_task_id ( id, name, category )
          )
        `
        )
        .eq("template_id", templateId);

      if (!linkErr && links) {
        setCompetenceLinks(links as unknown as CompetenceLink[]);
      }

      setLoading(false);
    }

    fetchData();
  }, [templateId]);

  // -------------------------------------------------
  // Actions
  // -------------------------------------------------

  async function handlePublish() {
    if (!template || template.status !== "draft") return;
    setActionLoading(true);

    const { error } = await supabase.rpc("publish_template", {
      p_template_id: template.id,
    });

    if (error) {
      alert(`Kunde inte publicera: ${error.message}`);
    } else {
      // Refresh
      const { data } = await supabase
        .from("checklist_template")
        .select("*")
        .eq("id", templateId)
        .single();
      if (data) setTemplate(data);
    }
    setActionLoading(false);
  }

  async function handleNewVersion() {
    if (!template || template.status !== "published") return;
    setActionLoading(true);

    const { data, error } = await supabase.rpc("create_new_template_version", {
      p_published_template_id: template.id,
    });

    if (error) {
      alert(`Kunde inte skapa ny version: ${error.message}`);
    } else if (data) {
      router.push(`/admin/templates/${data}`);
    }
    setActionLoading(false);
  }

  async function handleDeactivate() {
    if (!template) return;

    if (template.status === "draft") {
      if (!confirm("Vill du ta bort detta utkast? Åtgärden kan inte ångras.")) return;
      setActionLoading(true);
      const { error } = await supabase
        .from("checklist_template")
        .delete()
        .eq("id", template.id);
      if (error) {
        alert(`Kunde inte ta bort: ${error.message}`);
        setActionLoading(false);
      } else {
        router.push("/admin/templates");
      }
    } else {
      if (!confirm("Vill du avaktivera denna mall? Den försvinner från listan men finns kvar i databasen.")) return;
      setActionLoading(true);
      const { error } = await supabase
        .from("checklist_template")
        .update({ active: false })
        .eq("id", template.id);
      if (error) {
        alert(`Kunde inte avaktivera: ${error.message}`);
      } else {
        const { data } = await supabase
          .from("checklist_template")
          .select("*")
          .eq("id", templateId)
          .single();
        if (data) setTemplate(data);
      }
      setActionLoading(false);
    }
  }

  // -------------------------------------------------
  // Loading / not found
  // -------------------------------------------------

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Laddar...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Mallen hittades inte.</p>
        <Link href="/admin/templates" className="text-petrol-80 hover:text-petrol mt-2 inline-block">
          ← Tillbaka till mallar
        </Link>
      </div>
    );
  }

  // -------------------------------------------------
  // Render
  // -------------------------------------------------

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/templates"
        className="text-sm text-petrol-80 hover:text-petrol mb-4 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Tillbaka till mallar
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-petrol">{template.name}</h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-petrol-20 text-petrol">
                v{template.version}
              </span>
              {statusBadge(template.status, template.active)}
            </div>
            {template.description && (
              <p className="text-sm text-petrol-60 mb-3">{template.description}</p>
            )}
            <div className="flex gap-4 text-xs text-petrol-60">
              <span>Skapad: {formatDate(template.created_at)}</span>
              {template.published_at && (
                <span>Publicerad: {formatDate(template.published_at)}</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0 ml-4">
            {template.status === "draft" && (
              <>
                <Link
                  href={`/admin/templates/${template.id}/edit`}
                  className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-5 text-sm font-medium transition-colors"
                >
                  Redigera
                </Link>
                <button
                  onClick={handlePublish}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Publicera
                </button>
              </>
            )}
            {template.status === "published" && template.active && (
              <button
                onClick={handleNewVersion}
                disabled={actionLoading}
                className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Skapa ny version
              </button>
            )}
            {(template.status === "draft" || (template.status === "published" && template.active)) && (
              <button
                onClick={handleDeactivate}
                disabled={actionLoading}
                className="inline-flex items-center justify-center text-error rounded-3xl hover:bg-error-light min-h-[44px] px-5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {template.status === "draft" ? "Ta bort" : "Avaktivera"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Competence links */}
      {competenceLinks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate p-6 mb-6">
          <h2 className="text-base font-bold text-petrol mb-3">
            Leder till behörighet
          </h2>
          <div className="flex flex-wrap gap-2">
            {competenceLinks.map((link) => (
              <div
                key={link.id}
                className="inline-flex items-center gap-1.5 bg-cream rounded-lg px-3 py-1.5 text-sm"
              >
                <span className="font-medium text-petrol">
                  {link.competence_definition.work_task.name}
                </span>
                <span className="text-petrol-60">·</span>
                <span className="text-petrol-60">
                  {competenceTypeLabel(link.competence_definition.competence_type)}
                </span>
                <span className="text-petrol-60">·</span>
                <span className="text-petrol-80">
                  {link.competence_definition.display_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections and items */}
      <div className="bg-white rounded-xl border border-slate p-6">
        <h2 className="text-base font-bold text-petrol mb-4">
          Rubriker och moment
        </h2>

        {sections.length === 0 ? (
          <p className="text-petrol-60 text-sm">Inga rubriker tillagda.</p>
        ) : (
          <div className="space-y-5">
            {sections.map((section, sIdx) => (
              <div key={section.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full bg-petrol-20 text-petrol flex items-center justify-center text-sm font-medium shrink-0">
                    {sIdx + 1}
                  </span>
                  <h3 className="text-sm font-bold text-petrol">
                    {section.heading_text}
                  </h3>
                </div>
                {section.template_item.length > 0 && (
                  <ul className="ml-9 space-y-1">
                    {section.template_item.map((item, iIdx) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-accent-40 text-petrol flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                          {iIdx + 1}
                        </span>
                        <span className="text-sm text-petrol-80">
                          {item.item_text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}