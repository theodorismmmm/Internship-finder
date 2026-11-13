"use client";

import type { StudentProfile } from "@/lib/types";

interface ProfileEditorProps {
  profile: StudentProfile;
  onChange: (profile: StudentProfile) => void;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-neutral-500">{label}</span>
      <input
        className="mt-1.5 w-full border-0 border-b border-neutral-200 bg-transparent px-0 py-2 text-[15px] text-neutral-950 outline-none transition placeholder:text-neutral-300 focus:border-neutral-950"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function ProfileEditor({ profile, onChange }: ProfileEditorProps) {
  function patch(partial: Partial<StudentProfile>) {
    onChange({ ...profile, ...partial });
  }

  function list(values: string[]) {
    return values.join(", ");
  }

  function parseList(raw: string) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return (
    <section className="border-b border-neutral-200 py-10">
      <p className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
        Profil
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
        Angaben prüfen
      </h2>
      <p className="mt-2 text-[15px] text-neutral-500">
        Komma trennt mehrere Einträge.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Field
          label="Name"
          value={profile.name}
          onChange={(name) => patch({ name })}
          placeholder="Vor- und Nachname"
        />
        <Field
          label="Schulfächer"
          value={list(profile.schoolSubjects)}
          onChange={(v) => patch({ schoolSubjects: parseList(v) })}
          placeholder="Mathematik, Informatik"
        />
        <Field
          label="Stärken"
          value={list(profile.strengths)}
          onChange={(v) => patch({ strengths: parseList(v) })}
          placeholder="Zuverlässig, kreativ"
        />
        <Field
          label="Sprachen"
          value={list(profile.languages)}
          onChange={(v) => patch({ languages: parseList(v) })}
          placeholder="Deutsch, Englisch"
        />
        <Field
          label="Kenntnisse"
          value={list(profile.skills)}
          onChange={(v) => patch({ skills: parseList(v) })}
          placeholder="Word, Python"
        />
        <Field
          label="Hobbys"
          value={list(profile.hobbies)}
          onChange={(v) => patch({ hobbies: parseList(v) })}
          placeholder="Fußball, Fotografie"
        />
        <div className="sm:col-span-2">
          <Field
            label="Bisherige Praktika"
            value={list(profile.previousInternships)}
            onChange={(v) => patch({ previousInternships: parseList(v) })}
            placeholder="z. B. Büro bei Meier GmbH"
          />
        </div>
      </div>
    </section>
  );
}
