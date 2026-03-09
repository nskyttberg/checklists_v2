"use client";
// app/(employee)/my/components/mobile-header.tsx

import { useState } from "react";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0.75" y="2.75" width="11.5" height="8.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M0.75 5.75h11.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="3.75" cy="8.25" r="0.875" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeedbackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1a6 6 0 1 1 0 12A6 6 0 0 1 7 1Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 6v4M7 4.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Feedback modal (inlined) ──────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-petrol/30" onClick={onClose} />
      <div className="relative bg-white w-full rounded-t-2xl shadow-xl p-6 pb-10">
        {done ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5 11.5L9 15.5L17 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-base font-bold text-petrol mb-1">Tack för din återkoppling!</p>
            <p className="text-sm text-petrol-60 mb-6">Vi tar det vidare.</p>
            <button onClick={onClose} className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-6 text-sm font-medium transition-colors">
              Stäng
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-petrol">Förbättringsförslag</h2>
              <button onClick={onClose} className="text-petrol-60 p-1 -mr-1">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setType("bug")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  type === "bug" ? "border-red-300 bg-red-50 text-red-600" : "border-slate bg-white text-petrol-60"
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
                  type === "improvement" ? "border-accent bg-accent/5 text-accent" : "border-slate bg-white text-petrol-60"
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
              placeholder={type === "bug" ? "Beskriv vad som gick fel..." : "Beskriv din idé eller förbättring..."}
              rows={4}
              className="w-full border border-slate rounded-lg bg-white text-petrol placeholder-petrol-40 px-3 py-2.5 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
            />
            <p className="text-xs text-petrol-40 mb-4">Sida <span className="font-mono">{pathname}</span> skickas med automatiskt.</p>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="inline-flex items-center justify-center bg-white text-petrol border border-slate rounded-3xl hover:bg-cream min-h-[44px] px-5 text-sm font-medium transition-colors">
                Avbryt
              </button>
              <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center justify-center bg-accent text-white rounded-3xl hover:bg-accent-80 min-h-[44px] px-5 text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? "Skickar..." : "Skicka"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileHeader() {
  const { currentUser, allUsers, switchUser } = useUser();
  const router = useRouter();
  const [open, setOpen]                 = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  if (!currentUser) return null;

  const firstName = currentUser.name?.split(" ")[0] ?? currentUser.name;

  return (
    <>
      <header
        className="bg-petrol"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div
          className="flex items-center justify-between max-w-[480px] mx-auto px-5"
          style={{ height: 56 }}
        >
          {/* Brand */}
          <Image
            src="/aleris-logo-h-white.png"
            alt="Aleris"
            width={90}
            height={28}
            style={{ objectFit: "contain", objectPosition: "left center" }}
            priority
          />

          {/* Right side controls */}
          <div className="flex items-center" style={{ gap: 4 }}>

            {/* Feedback — always visible */}
            <button
              onClick={() => setShowFeedback(true)}
              className="flex items-center gap-1.5"
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
                fontWeight: 500,
                background: "none",
                border: "none",
                cursor: "pointer",
                minHeight: 44,
                padding: "0 8px",
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label="Förbättringsförslag"
            >
              <FeedbackIcon />
              <span>Feedback</span>
            </button>

            {/* Separator */}
            <div style={{ width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 4px" }} />

            {/* Admin shortcut */}
            {currentUser.is_admin && (
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center gap-1.5"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 12,
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  minHeight: 44,
                  padding: "0 8px",
                  WebkitTapHighlightColor: "transparent",
                }}
                aria-label="Adminvy"
              >
                <AdminIcon />
                <span>Admin</span>
              </button>
            )}

            {currentUser.is_admin && (
              <div style={{ width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 4px" }} />
            )}

            {/* User name + switcher */}
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1"
              style={{
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                background: "none",
                border: "none",
                cursor: "pointer",
                minHeight: 44,
                padding: "0 0 0 4px",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span>{firstName}</span>
              <span style={{ color: "rgba(255,255,255,0.45)", display: "flex" }}>
                <ChevronDownIcon open={open} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Dev switcher panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,72,81,0.15)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed left-0 right-0 z-50 bg-white"
            style={{
              top: `calc(56px + env(safe-area-inset-top, 0px))`,
              borderBottom: "1px solid var(--color-slate)",
              boxShadow: "0 4px 16px rgba(0,72,81,0.08)",
            }}
          >
            <div className="max-w-[480px] mx-auto">
              <div className="px-5" style={{ paddingTop: 12, paddingBottom: 8, borderBottom: "1px solid var(--color-slate)" }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-petrol-60)" }}>
                  Byt testanvändare
                </p>
              </div>
              {allUsers.map((u) => {
                const isActive = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => { switchUser(u.id); setOpen(false); }}
                    className="w-full flex items-center justify-between"
                    style={{ padding: "11px 20px", borderBottom: "1px solid var(--color-slate)", background: "none", border: "none", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                  >
                    <span style={{ fontSize: 14, color: isActive ? "var(--color-petrol)" : "var(--color-petrol-80)", fontWeight: isActive ? 600 : 400 }}>
                      {u.name}
                    </span>
                    {isActive && <span style={{ color: "var(--color-success)" }}><CheckIcon /></span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}