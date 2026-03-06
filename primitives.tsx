// lib/ui/primitives.tsx
// Shared UI primitives used across admin shell components.
// Kept in one file to minimise import paths.

import type { BadgeVariant } from "@/lib/contexts/admin-nav-context";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// ── Avatar ────────────────────────────────────────────────────────────────────

interface AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const avatarSizes = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-8 h-8 text-[11px]",
  lg: "w-12 h-12 text-base",
};

export function Avatar({ initials, size = "md", className = "" }: AvatarProps) {
  return (
    <div
      className={`
        ${avatarSizes[size]} bg-accent
        rounded-full flex items-center justify-center
        font-bold text-white flex-shrink-0 select-none
        ${className}
      `}
    >
      {initials}
    </div>
  );
}

// Square icon for templates
export function TemplateIcon() {
  return (
    <div className="w-7 h-7 bg-sand border border-slate rounded-lg flex items-center justify-center flex-shrink-0">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="1" y="1" width="11" height="11" rx="1.5" stroke="#4F868E" strokeWidth="1.3" />
        <path d="M3.5 4.5h6M3.5 7h4" stroke="#4F868E" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-sand border-slate text-petrol-80",
  active:  "bg-success-light border-success/30 text-success",
  draft:   "bg-accent-40 border-accent-60 text-accent",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-[11.5px] font-medium leading-none ${badgeVariants[variant]}`}
    >
      {children}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:   "bg-accent text-white hover:bg-accent-80 border-transparent",
  secondary: "bg-white text-petrol border-slate hover:bg-sand",
  ghost:     "bg-transparent text-petrol-80 border-transparent hover:bg-sand hover:text-petrol",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-3xl border font-medium
        transition-colors duration-100
        disabled:opacity-40 disabled:cursor-not-allowed
        ${buttonVariants[variant]}
        ${size === "sm" ? "h-8 px-4 text-[13px]" : "min-h-[44px] px-5 text-sm"}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

// ── Tag ───────────────────────────────────────────────────────────────────────

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center bg-sand border border-slate rounded-full px-2.5 py-0.5 text-[12px] text-petrol-80">
      {children}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}
