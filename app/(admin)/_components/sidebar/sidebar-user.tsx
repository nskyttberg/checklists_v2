"use client";
// app/(admin)/_components/sidebar/sidebar-user.tsx
// User card + feedback + "Gå till min vy" + "Logga ut" at the bottom of the sidebar.

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/user-context";
import { getInitials } from "@/lib/ui/primitives";
import { supabase } from "@/lib/supabase";

// ── Icons ─────────────────────────────────────────────────────────────────────

const SwitchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7h10M8.5 4L12 7l-3.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5.5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2.5M9.5 9.5L12 7l-2.5-2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FeedbackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1a6 6 0 1 1 0 12A6 6 0 0 1 7 1Z" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7 5.5v4M7 4h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ── Feedback modal ────────────────────────────────────────────────────────────

type FeedbackType = "bug" | "improvement";

function FeedbackModal({ onClose }: { onClose: () => void }) {
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-petrol/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md mx-4 rounded-xl shadow-xl p-6">
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
              <button onClick={onClose} className="text-petrol-60 hover:text-petrol transition-colors p-1 -mr-1">
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
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="8.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M5.5 4C5.5 3.2 6.4 2.5 7.5 2.5s2 .7 2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M3 6.5H1M3 10.5H1M12 6.5h2M12 10.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
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
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1a4 4 0 0 1 2 7.5V10H5.5V8.5A4 4 0 0 1 7.5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M5.5 12h4M6 13.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                Förbättringsförslag
              </button>
            </div>

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

// ── SidebarUser ───────────────────────────────────────────────────────────────

export function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const { currentUser }                 = useUser();
  const [showFeedback, setShowFeedback] = useState(false);

  if (!currentUser) return null;

  const initials = getInitials(currentUser.name);

  return (
    <>
      <div className="flex-shrink-0 border-t border-white/[0.08] px-1.5 pb-2.5 pt-2">
        {/* User card */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 select-none">
            {initials}
          </div>
          <div className={`overflow-hidden transition-opacity duration-150 ${collapsed ? "opacity-0 w-0" : "opacity-100"}`}>
            <div className="text-[13px] font-semibold text-white whitespace-nowrap">{currentUser.name}</div>
            <div className="text-[11px] text-petrol-60 whitespace-nowrap">
              {currentUser.is_admin ? "Administratör" : "Medarbetare"}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-0.5 mt-1">

          {/* Feedback */}
          <button
            onClick={() => setShowFeedback(true)}
            className="group relative flex items-center gap-2.5 px-2 h-[34px] w-full text-left rounded-lg text-petrol-60 hover:bg-white/[0.07] hover:text-white transition-colors duration-100"
          >
            <span className="flex-shrink-0 w-[18px] flex items-center justify-center">
              <FeedbackIcon />
            </span>
            <span className={`text-[12.5px] whitespace-nowrap transition-opacity duration-150 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
              Förbättringsförslag
            </span>
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2 bg-petrol-80 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                Förbättringsförslag
              </span>
            )}
          </button>

          {/* Go to my view */}
          <Link
            href="/my"
            className="group relative flex items-center gap-2.5 px-2 h-[34px] rounded-lg text-petrol-60 hover:bg-white/[0.07] hover:text-accent-60 transition-colors duration-100"
          >
            <span className="flex-shrink-0 w-[18px] flex items-center justify-center">
              <SwitchIcon />
            </span>
            <span className={`text-[12.5px] whitespace-nowrap transition-opacity duration-150 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
              Gå till min vy
            </span>
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2 bg-petrol-80 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                Gå till min vy
              </span>
            )}
          </Link>

          {/* Log out */}
          <button
            onClick={() => { console.warn("Sign out not yet implemented"); }}
            className="group relative flex items-center gap-2.5 px-2 h-[34px] w-full text-left rounded-lg text-petrol-60 hover:bg-white/[0.07] hover:text-white transition-colors duration-100"
          >
            <span className="flex-shrink-0 w-[18px] flex items-center justify-center">
              <LogoutIcon />
            </span>
            <span className={`text-[12.5px] whitespace-nowrap transition-opacity duration-150 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
              Logga ut
            </span>
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2 bg-petrol-80 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                Logga ut
              </span>
            )}
          </button>
        </div>
      </div>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}