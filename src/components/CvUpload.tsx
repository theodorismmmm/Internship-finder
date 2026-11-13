"use client";

import { useRef, useState } from "react";
import type { StudentProfile } from "@/lib/types";

interface CvUploadProps {
  onParsed: (profile: StudentProfile) => void;
  onSkip: () => void;
}

export function CvUpload({ onParsed, onSkip }: CvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyNote, setPrivacyNote] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setPrivacyNote(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-cv", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
      setPrivacyNote(data.privacyNote);
      onParsed(data.profile as StudentProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-b border-neutral-200 py-10">
      <p className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
        Optional
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
        Lebenslauf
      </h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-500">
        Freiwillig. PDF oder DOCX – Text wird nur kurz gelesen, Datei wird nicht
        gespeichert. Die Karte funktioniert auch ohne.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-neutral-950 px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Wird gelesen…" : "Datei wählen"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] font-medium text-neutral-500 underline-offset-4 hover:text-neutral-950 hover:underline"
        >
          Manuell fortfahren
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <p className="mt-5 max-w-xl text-[12px] leading-relaxed text-neutral-400">
        Datenschutz: Verarbeitung nur im Arbeitsspeicher. Profil optional lokal
        im Browser.
      </p>
      {privacyNote && (
        <p className="mt-2 text-[13px] text-neutral-600">{privacyNote}</p>
      )}
      {error && (
        <p className="mt-2 text-[13px] text-neutral-950" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
