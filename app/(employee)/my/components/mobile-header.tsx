"use client";
// app/(employee)/my/components/mobile-header.tsx

import { useState } from "react";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FeedbackModal } from "@/lib/ui/feedback-modal";

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

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileHeader() {
  const { currentUser, allUsers, switchUser } = useUser();
  const router = useRouter();
  const [open, setOpen]               = useState(false);
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

            {/* Feedback button — always visible */}
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
            <div
              style={{
                width: 1,
                height: 14,
                backgroundColor: "rgba(255,255,255,0.15)",
                margin: "0 4px",
              }}
            />

            {/* Admin shortcut — only for admins */}
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

            {/* Separator (only when admin) */}
            {currentUser.is_admin && (
              <div
                style={{
                  width: 1,
                  height: 14,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  margin: "0 4px",
                }}
              />
            )}

            {/* User name + switcher trigger */}
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
              <div
                className="px-5"
                style={{ paddingTop: 12, paddingBottom: 8, borderBottom: "1px solid var(--color-slate)" }}
              >
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
                    {isActive && (
                      <span style={{ color: "var(--color-success)" }}>
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Feedback modal */}
      {showFeedback && (
        <FeedbackModal
          employeeId={currentUser.id}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </>
  );
}