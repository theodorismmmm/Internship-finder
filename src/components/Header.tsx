"use client";

interface HeaderProps {
  merklisteCount: number;
  onOpenMerkliste: () => void;
}

export function Header({ merklisteCount, onOpenMerkliste }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-neutral-950">
            PraktikumsRadar
          </p>
          <p className="text-[12px] text-neutral-500">Klasse 8–10</p>
        </div>
        <button
          type="button"
          onClick={onOpenMerkliste}
          className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-[13px] font-medium text-neutral-900 transition hover:bg-neutral-50"
        >
          Merkliste{merklisteCount > 0 ? ` · ${merklisteCount}` : ""}
        </button>
      </div>
    </header>
  );
}
