"use client";
// app/(admin)/_components/topbar/topbar.tsx
// Contextual topbar — visible only on deep views (staff/[id], templates/[id]).
// Hidden (opacity:0, pointer-events:none) on top-level views.
// Height always reserved to prevent layout jumps.
// left position tracks --sidebar-w CSS variable set by Sidebar.

import Link from "next/link";
import { useAdminNav } from "@/lib/contexts/admin-nav-context";
import { Avatar, TemplateIcon, Badge } from "@/lib/ui/primitives";

// ── Back button ───────────────────────────────────────────────────────────────

function TopbarBack({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 text-petrol-80 hover:text-petrol text-[13px] transition-colors duration-100"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}

// ── Context object display ────────────────────────────────────────────────────

function TopbarObject() {
  const { topbarCtx } = useAdminNav();
  if (!topbarCtx) return null;

  return (
    <div className="flex items-center gap-3">
      {topbarCtx.type === "staff" && topbarCtx.initials ? (
        <Avatar
          initials={topbarCtx.initials}
          size="sm"
          className="bg-petrol-20 text-petrol"
        />
      ) : (
        <TemplateIcon />
      )}
      <div>
        <div className="text-[14px] font-semibold text-petrol leading-tight">
          {topbarCtx.name}
        </div>
        <div className="text-[12px] text-petrol-60 leading-tight mt-0.5">
          {topbarCtx.meta}
        </div>
      </div>
      {topbarCtx.badge && (
        <Badge variant={topbarCtx.badgeVariant ?? "default"}>
          {topbarCtx.badge}
        </Badge>
      )}
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────

export function Topbar() {
  const { topbarCtx } = useAdminNav();
  const visible = topbarCtx !== null;

  return (
    <header
      className={`
        fixed top-0 right-0 z-40 h-[52px]
        bg-white border-b border-slate
        flex items-center px-7
        transition-[opacity,transform] duration-200 ease-out
        ${visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-1 pointer-events-none"
        }
      `}
      style={{ left: "var(--sidebar-w, 220px)" }}
    >
      {topbarCtx && (
        <div className="flex items-center gap-4 w-full">
          <TopbarBack href={topbarCtx.backHref} label={topbarCtx.backLabel} />
          <div className="w-px h-5 bg-slate flex-shrink-0" />
          <TopbarObject />
        </div>
      )}
    </header>
  );
}