"use client";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-label="Merkliste"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-auto bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-tight text-neutral-950">
            Merkliste
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-neutral-500 hover:text-neutral-950"
          >
            Schließen
          </button>
        </div>
        <p className="mt-1 text-[12px] text-neutral-400">Nur in diesem Browser</p>
        <ul className="mt-6 space-y-4">
          {items.length === 0 && (
            <li className="py-8 text-center text-[13px] text-neutral-400">
              Noch nichts gemerkt.
            </li>
          )}
          {items.map((item) => (
            <li key={item.id} className="border-b border-neutral-100 pb-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <p className="text-[14px] font-medium text-neutral-950">
                  {item.title}
                </p>
                <p className="text-[12px] text-neutral-500">{item.company}</p>
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="mt-2 text-[12px] text-neutral-400 hover:text-neutral-950"
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
