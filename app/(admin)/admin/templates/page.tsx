"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// -------------------------------------------------
// Types
// -------------------------------------------------

interface Template {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: "draft" | "published";
  active: boolean;
  created_at: string;
  published_at: string | null;
}

// -------------------------------------------------
// Helpers
// -------------------------------------------------

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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      const { data, error } = await supabase
        .from("checklist_template")
        .select("*")
        .order("name")
        .order("version", { ascending: false });

      if (error) {
        console.error("Failed to fetch templates:", error.message);
      } else {
        setTemplates(data || []);
      }
      setLoading(false);
    }

    fetchTemplates();
  }, []);

  // -------------------------------------------------
  // Loading
  // -------------------------------------------------

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-petrol-60">Laddar...</p>
      </div>
    );
  }

  // -------------------------------------------------
  // Empty state
  // -------------------------------------------------

  if (templates.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-white rounded-xl border border-slate p-10 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-petrol">Inga mallar Ã¤nnu</h1>
          <p className="text-petrol-60 mt-2 mb-6">
            Skapa din fÃ¶rsta checklistemall fÃ¶r att komma igÃ¥ng.
          </p>
          <Link
            href="/admin/templates/new"
            className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors"
          >
            Skapa ny mall
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------
  // Template list
  // -------------------------------------------------

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-petrol">Checklistemallar</h1>
        <Link
          href="/admin/templates/new"
          className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors"
        >
          Skapa ny mall
        </Link>
      </div>

      <div className="grid gap-4">
        {templates.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/admin/templates/${tpl.id}`}
            className="block bg-white rounded-xl border border-slate p-5 hover:border-petrol-40 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-petrol truncate">
                    {tpl.name}
                  </h2>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-petrol-20 text-petrol shrink-0">
                    v{tpl.version}
                  </span>
                  {statusBadge(tpl.status, tpl.active)}
                </div>
                {tpl.description && (
                  <p className="text-sm text-petrol-60 line-clamp-2">
                    {tpl.description}
                  </p>
                )}
              </div>
              <svg
                className="w-5 h-5 text-petrol-40 ml-4 mt-1 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
