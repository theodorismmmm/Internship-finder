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
    <section className="rounded-3xl border border-teal-900/10 bg-white/80 p-5 shadow-sm sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
        2. Berufsfelder wählen
      </h2>
      <p className="mt-1 text-sm text-teal-900/70">
        Wähle Bereiche, die dich interessieren. Vorschläge aus dem Lebenslauf
        sind markiert.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CAREER_FIELDS.map((field) => {
          const checked = selected.includes(field.id);
          const isSuggested = suggested.includes(field.id);
          return (
            <label
              key={field.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                checked
                  ? "border-teal-600 bg-teal-50"
                  : "border-teal-900/10 bg-white hover:border-teal-700/30"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-teal-700"
                checked={checked}
                onChange={() => toggle(field.id)}
              />
              <span>
                <span className="block text-sm font-medium text-teal-950">
                  {field.label}
                </span>
                {isSuggested && (
                  <span className="mt-0.5 inline-block text-xs text-amber-800">
                    Vorschlag aus Lebenslauf
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
