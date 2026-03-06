// app/(admin)/_components/sidebar/sidebar-logo.tsx
// Aleris logotype. Full when expanded, compact A-mark when collapsed.

import Image from "next/image";

export function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center h-14 px-4 border-b border-white/[0.08] flex-shrink-0 overflow-hidden">
      {collapsed ? (
        <div className="w-7 h-7 rounded-md bg-white/[0.12] flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 12L7 2L12 12" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 9h6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      ) : (
        <Image
          src="/aleris-logo-h-white.png"
          alt="Aleris"
          width={110}
          height={22}
          style={{ height: 22, width: "auto", objectFit: "contain", objectPosition: "left" }}
          priority
        />
      )}
    </div>
  );
}
