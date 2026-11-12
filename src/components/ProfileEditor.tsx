"use client";

import type { StudentProfile } from "@/lib/types";

interface ProfileEditorProps {
  profile: StudentProfile;
  onChange: (profile: StudentProfile) => void;
}

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-teal-950">{label}</span>
      <input
        className="mt-1 w-full rounded-xl border border-teal-900/15 bg-white px-3 py-2 text-sm outline-none ring-teal-600/30 focus:ring-2"
        value={values.join(", ")}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
      <span className="mt-1 block text-xs text-teal-900/50">
        Mehrere Einträge mit Komma trennen
      </span>
    </label>
  );
}

export function ProfileEditor({ profile, onChange }: ProfileEditorProps) {
  function patch(partial: Partial<StudentProfile>) {
    onChange({ ...profile, ...partial });
  }

  return (
    <section className="rounded-3xl border border-teal-900/10 bg-white/80 p-5 shadow-sm sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
        Dein Profil
      </h2>
      <p className="mt-1 text-sm text-teal-900/70">
        Prüfe und ergänze die automatisch erkannten Angaben.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-teal-950">Name</span>
          <input
            className="mt-1 w-full rounded-xl border border-teal-900/15 bg-white px-3 py-2 text-sm outline-none ring-teal-600/30 focus:ring-2"
            value={profile.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Vor- und Nachname"
          />
        </label>
        <TagInput
          label="Schulfächer"
          values={profile.schoolSubjects}
          onChange={(schoolSubjects) => patch({ schoolSubjects })}
          placeholder="z. B. Mathematik, Informatik"
        />
        <TagInput
          label="Stärken"
          values={profile.strengths}
          onChange={(strengths) => patch({ strengths })}
          placeholder="z. B. Teamfähig, kreativ"
        />
        <TagInput
          label="Sprachen"
          values={profile.languages}
          onChange={(languages) => patch({ languages })}
          placeholder="z. B. Deutsch, Englisch"
        />
        <TagInput
          label="Kenntnisse"
          values={profile.skills}
          onChange={(skills) => patch({ skills })}
          placeholder="z. B. Word, Python"
        />
        <TagInput
          label="Hobbys"
          values={profile.hobbies}
          onChange={(hobbies) => patch({ hobbies })}
          placeholder="z. B. Fußball, Basteln"
        />
        <TagInput
          label="Bisherige Praktika"
          values={profile.previousInternships}
          onChange={(previousInternships) => patch({ previousInternships })}
          placeholder="z. B. Büro bei Meier GmbH"
        />
      </div>
    </section>
  );
}
