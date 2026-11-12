"use client";

import { Bookmark, Radar } from "lucide-react";

interface HeaderProps {
  merklisteCount: number;
  onOpenMerkliste: () => void;
}

export function Header({ merklisteCount, onOpenMerkliste }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-teal-900/10 bg-[#f4fbf8]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-sm shadow-teal-900/20">
            <Radar className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl leading-none tracking-tight text-teal-950 sm:text-2xl">
              PraktikumsRadar
            </p>
            <p className="mt-0.5 text-xs text-teal-900/60">
              Schülerpraktikum finden · Klasse 8–10
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenMerkliste}
          className="inline-flex items-center gap-2 rounded-xl border border-teal-800/15 bg-white px-3 py-2 text-sm font-medium text-teal-950 shadow-sm transition hover:border-teal-700/30 hover:bg-teal-50"
        >
          <Bookmark className="h-4 w-4 text-teal-700" />
          Merkliste
          {merklisteCount > 0 && (
            <span className="rounded-md bg-teal-700 px-1.5 py-0.5 text-xs text-white">
              {merklisteCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
