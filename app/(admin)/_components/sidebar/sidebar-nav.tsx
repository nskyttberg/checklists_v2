"use client";
// app/(admin)/_components/sidebar/sidebar-nav.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Icons ─────────────────────────────────────────────────────────────────────

const Icons = {
  overview: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  staff: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="5.5" cy="4.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1 13c0-2.5 2-4.5 4.5-4.5S10 10.5 10 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10.5 7a1.8 1.8 0 100-3.6M14 13c0-2-1.6-3.6-3.5-3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  templates: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 5.5h6M4.5 8.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  methods: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 4.5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  licence: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="4" width="13" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="4.5" cy="8" r="1.3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 6.5h3.5M8 9.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactElement;
  disabled?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// ── Nav definition ────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Checklistor",
    items: [
      { label: "Översikt",    href: "/admin",           icon: Icons.overview },
      { label: "Medarbetare", href: "/admin/staff",     icon: Icons.staff },
      { label: "Mallar",      href: "/admin/templates", icon: Icons.templates },
      { label: "Metoder",     href: "/admin/methods",   icon: Icons.methods },
    ],
  },
  {
    label: "Kommande",
    items: [
      { label: "Körkort", href: "/admin/licence", icon: Icons.licence, disabled: true },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav className="flex-1 py-2.5 overflow-y-auto overflow-x-hidden">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div
            className={`text-[10px] font-bold tracking-[0.08em] uppercase text-petrol-60 px-4 pt-3 pb-1 whitespace-nowrap transition-opacity duration-150 ${
              collapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            {section.label}
          </div>

          {section.items.map((item) => {
            const active = isActive(item.href);

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="relative flex items-center gap-2.5 mx-1.5 px-2.5 h-[38px] rounded-lg opacity-40 cursor-not-allowed text-petrol-40"
                >
                  <span className="flex-shrink-0 w-[18px] flex items-center justify-center">
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="text-[13.5px] whitespace-nowrap">
                      {item.label}
                      <span className="ml-1.5 text-[10px] opacity-60">snart</span>
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex items-center gap-2.5
                  mx-1.5 px-2.5 h-[38px] rounded-lg
                  transition-colors duration-100 group
                  ${active
                    ? "bg-accent/[0.14] text-accent"
                    : "text-petrol-40/85 hover:bg-white/[0.07] hover:text-white"
                  }
                `}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent rounded-r-sm -ml-1.5" />
                )}
                <span className="flex-shrink-0 w-[18px] flex items-center justify-center">
                  {item.icon}
                </span>
                <span
                  className={`text-[13.5px] whitespace-nowrap transition-opacity duration-150 ${
                    collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                  }`}
                >
                  {item.label}
                </span>

                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-petrol-80 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 shadow-lg z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="h-px bg-white/[0.07] mx-3 my-2" />
        </div>
      ))}
    </nav>
  );
}