import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aleris Checklistor",
  description: "Checklistesystem for Aleris Klinisk Fysiologi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="bg-sand min-h-screen" style={{ fontFamily: "Arial, system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
