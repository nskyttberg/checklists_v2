// app/(admin)/layout.tsx
// Replaces the previous layout that imported AppShell from ./app-shell.
// Now imports AdminShell from ./_components/admin-shell.

import { AdminShell } from "./_components/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
