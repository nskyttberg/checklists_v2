"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserProvider, useUser } from "../lib/user-context";

// -------------------------------------------------
// Nav links
// -------------------------------------------------

const navLinks = [
  { href: "/admin", label: "Översikt" },
  { href: "/admin/templates", label: "Mallar" },
  { href: "/admin/staff", label: "Medarbetare" },
];

// -------------------------------------------------
// Header (inside UserProvider)
// -------------------------------------------------

function Header() {
  const pathname = usePathname();
  const { currentUser, allUsers, switchUser, loading } = useUser();

  return (
    <header className="bg-petrol">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Top row: brand + user switcher */}
        <div className="flex items-center justify-between h-14">
          <Link href="/admin" className="text-white font-bold text-lg tracking-tight">
            Aleris Checklistor
          </Link>

          {/* Dev user switcher */}
          {!loading && (
            <div className="flex items-center gap-3">
              <span className="text-petrol-40 text-xs hidden sm:inline">
                Inloggad som:
              </span>
              <select
                value={currentUser?.id || ""}
                onChange={(e) => switchUser(e.target.value)}
                className="bg-petrol text-white text-sm border border-petrol-60 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-petrol-60"
              >
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Navigation tabs */}
        <nav className="flex gap-1 -mb-px">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  isActive
                    ? "text-white bg-petrol-80/20"
                    : "text-petrol-40 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

// -------------------------------------------------
// App shell (wraps everything in UserProvider)
// -------------------------------------------------

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </UserProvider>
  );
}