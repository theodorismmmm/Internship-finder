"use client";

import { X } from "lucide-react";
import type { InternshipOffer } from "@/lib/types";

interface MerklisteModalProps {
  open: boolean;
  items: InternshipOffer[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
}

export function MerklisteModal({
  open,
  items,
  onClose,
  onRemove,
  onSelect,
}: MerklisteModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-teal-950/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-label="Merkliste"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-teal-950">
            Merkliste
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
          Gespeichert nur in diesem Browser (localStorage).
        </p>
        <ul className="mt-4 space-y-2">
          {items.length === 0 && (
            <li className="rounded-xl border border-dashed border-teal-900/20 px-3 py-6 text-center text-sm text-teal-900/55">
              Noch keine gemerkten Plätze.
            </li>
          )}
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-teal-900/10 p-3"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <p className="font-medium text-teal-950">{item.title}</p>
                <p className="text-sm text-teal-900/70">{item.company}</p>
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="mt-2 text-xs font-medium text-rose-700 hover:underline"
              >
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
