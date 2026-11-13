"use client";

import { CAREER_FIELDS } from "@/lib/fields";
import type { CareerFieldId } from "@/lib/types";

interface FieldSelectorProps {
  selected: CareerFieldId[];
  suggested: CareerFieldId[];
  onChange: (fields: CareerFieldId[]) => void;
}

export function FieldSelector({
  selected,
  suggested,
  onChange,
}: FieldSelectorProps) {
  function toggle(id: CareerFieldId) {
    if (selected.includes(id)) {
      onChange(selected.filter((f) => f !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <section className="border-b border-neutral-200 py-10">
      <p className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
        Optional
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
        Interessen
      </h2>
      <p className="mt-2 text-[15px] text-neutral-500">
        Nicht nötig für die Suche – verbessert nur die Passung. Vorschläge aus
        dem Lebenslauf sind markiert.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {CAREER_FIELDS.map((field) => {
          const checked = selected.includes(field.id);
          const isSuggested = suggested.includes(field.id);
          return (
            <button
              key={field.id}
              type="button"
              onClick={() => toggle(field.id)}
              className={`rounded-full border px-4 py-2 text-[13px] transition ${
                checked
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {field.label}
              {isSuggested && !checked ? (
                <span className="ml-1.5 text-neutral-400">· Vorschlag</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
