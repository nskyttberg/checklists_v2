"use client";
// lib/ui/feedback-modal.tsx
// Shared feedback modal — used in both admin topbar and mobile header.
// Resolves employeeId internally via useUser() so callers don't need to pass it.

import { useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";

// -------------------------------------------------
// Types
// -------------------------------------------------

type FeedbackType = "bug" | "improvement";

interface FeedbackModalProps {
  onClose: () => void;
}

// -------------------------------------------------
// Icons
// -------------------------------------------------

function BugIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 4.5C6 3.4 6.9 2.5 8 2.5s2 .9 2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3.5 7H1M3.5 11H1M12.5 7H15M12.5 11H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5.5 4L3.5 2M10.5 4L12.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IdeaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5a4.5 4.5 0 0 1 2 8.5v1.5H6V10A4.5 4.5 0 0 1 8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 13h4M6.5 14.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// -------------------------------------------------
// Component
// -------------------------------------------------

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const pathname        = usePathname();
  const { currentUser } = useUser();

  const [type, setType]       = useState<FeedbackType>("improvement");
  const [message, setMessage] = useState("");
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit() {
    if (!message.trim()) { setError("Skriv ett meddelande."); return; }
    setSaving(true);
    setError("");

    const { error: err } = await supabase.from("feedback").insert({
      type,
      message:     message.trim(),
      page_url:    pathname,
      employee_id: currentUser?.id ?? null,
    });

    if (err) { setError(err.message); setSaving(false); return; }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-petrol/30" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-xl rounded-t-2xl shadow-xl p-6 pb-8 sm:pb-6">
        {done ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5 11.5L9 15.5L17 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-base font-bold text-petrol mb-1">Tack för din återkoppling!</p>
            <p className="text-sm text-petrol-60 mb-6">Vi tar det vidare.</p>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors"
            >
              Stäng
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-petrol">Förbättringsförslag</h2>
              <button
                onClick={onClose}
                className="text-petrol-60 hover:text-petrol transition-colors p-1 -mr-1"
                aria-label="Stäng"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Type selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setType("bug")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  type === "bug"
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-slate bg-white text-petrol-60 hover:bg-cream"
                }`}
              >
                <BugIcon />
                Fel
              </button>
              <button
                onClick={() => setType("improvement")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  type === "improvement"
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-slate bg-white text-petrol-60 hover:bg-cream"
                }`}
              >
                <IdeaIcon />
                Förbättringsförslag
              </button>
            </div>

            {/* Message */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === "bug"
                  ? "Beskriv vad som gick fel och vad du förväntade dig..."
                  : "Beskriv din idé eller vad som skulle göra systemet bättre..."
              }
              rows={4}
              className="w-full border border-slate rounded-lg bg-white text-petrol placeholder-petrol-40 px-3 py-2.5 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
            />

            {/* Context info */}
            <p className="text-xs text-petrol-40 mb-4">
              Sida <span className="font-mono">{pathname}</span> skickas med automatiskt.
            </p>

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
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Skickar..." : "Skicka"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}