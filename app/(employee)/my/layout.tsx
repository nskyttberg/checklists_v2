"use client";

import { UserProvider } from "@/lib/user-context";

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}
