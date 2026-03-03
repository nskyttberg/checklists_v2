import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./app-shell";

export const metadata: Metadata = {
  title: "Aleris — Checklistor",
  description: "Behörighets- och checklistesystem för Aleris Klinisk Fysiologi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-sand">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}