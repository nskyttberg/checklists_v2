"use client";
// app/(employee)/my/components/tab-bar.tsx
// Sticky tab bar shown on top-level views (home / sign / competences).
// Sits below MobileHeader. Uses Tailwind v4 tokens from globals.css.

type Tab = "home" | "sign" | "competences";

interface TabBarProps {
  activeTab: Tab;
  signBadge: number;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "home",        label: "Mina upplärningar" },
  { id: "sign",        label: "Signera"           },
  { id: "competences", label: "Behörigheter"      },
];

export function TabBar({ activeTab, signBadge, onChange }: TabBarProps) {
  return (
    <div
      className="bg-petrol"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div
        className="flex max-w-[480px] mx-auto"
        style={{ paddingLeft: 4, paddingRight: 4 }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const badge    = tab.id === "sign" && signBadge > 0 ? signBadge : 0;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="relative flex-1 flex items-center justify-center"
              style={{
                minHeight: 44,
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "white" : "rgba(255,255,255,0.45)",
                background: "none",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--color-accent)"
                  : "2px solid transparent",
                cursor: "pointer",
                paddingBottom: 2,
                WebkitTapHighlightColor: "transparent",
                transition: "color 0.15s, border-color 0.15s",
              }}
              aria-selected={isActive}
            >
              {tab.label}
              {badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: "calc(50% - 36px)",
                    backgroundColor: "var(--color-accent)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: 1,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 99,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}