"use client";

import { useState } from "react";
import { Copy, X } from "lucide-react";

interface CoverLetterModalProps {
  open: boolean;
  text: string;
  onClose: () => void;
}

export function CoverLetterModal({ open, text, onClose }: CoverLetterModalProps) {
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const copied = open && copiedFor === text;

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFor(text);
    } catch {
      setCopiedFor(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-teal-950/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-label="Anschreiben-Entwurf"
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            Anschreiben-Entwurf
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-teal-900 hover:bg-teal-50"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-teal-900/65">
          Automatisch erzeugt – bitte prüfen und persönlich anpassen.
        </p>
        <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-teal-50/80 p-4 text-sm leading-relaxed text-teal-950">
          {text}
        </pre>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Kopiert!" : "Text kopieren"}
        </button>
      </div>
    </div>
  );
}
