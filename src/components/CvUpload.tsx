"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, ShieldCheck } from "lucide-react";
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
    <section className="rounded-3xl border border-teal-900/10 bg-white/80 p-5 shadow-sm sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
        1. Lebenslauf hochladen
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-teal-900/70">
        Lade deinen Lebenslauf als PDF oder DOCX hoch. Wir lesen nur den Text aus
        und zeigen dir ein bearbeitbares Profil.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
          {loading ? "Wird gelesen…" : "PDF / DOCX wählen"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
        >
          Ohne Lebenslauf weiter (Profil manuell)
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

      <div className="mt-4 flex gap-2 rounded-2xl bg-teal-50 px-3 py-2.5 text-sm text-teal-900/80">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
        <p>
          <strong>Datenschutz:</strong> Dein Lebenslauf wird{" "}
          <strong>nicht gespeichert</strong>. Die Datei wird nur kurz auf dem
          Server im Arbeitsspeicher gelesen und danach verworfen. Das Profil
          bleibt nur in deinem Browser (optional).
        </p>
      </div>

      {privacyNote && (
        <p className="mt-2 text-sm text-teal-800">{privacyNote}</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
