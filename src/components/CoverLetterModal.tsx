"use client";

import { useState } from "react";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-label="Anschreiben-Entwurf"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-auto bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-tight text-neutral-950">
            Anschreiben
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-neutral-500 hover:text-neutral-950"
          >
            Schließen
          </button>
        </div>
        <p className="mt-1 text-[12px] text-neutral-400">
          Entwurf – bitte prüfen und anpassen.
        </p>
        <pre className="mt-5 whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-700">
          {text}
        </pre>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-6 rounded-full bg-neutral-950 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-neutral-800"
        >
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>
    </div>
  );
}
