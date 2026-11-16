import type { Metadata } from "next";
import { WatermarkLink } from "@/components/WatermarkLink";
import "./globals.css";

export const metadata: Metadata = {
  title: "PraktikumsRadar",
  description:
    "Finde passende Schülerpraktika in deiner Nähe – mit Profil, Karte und echten Angeboten der Bundesagentur für Arbeit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="flex min-h-full flex-col pb-16 font-sans">
        {children}
        <WatermarkLink />
      </body>
    </html>
  );
}
