import { suggestFieldsFromText } from "./fields";
import type { StudentProfile } from "./types";

const SUBJECTS = [
  "Mathematik",
  "Deutsch",
  "Englisch",
  "Französisch",
  "Spanisch",
  "Latein",
  "Physik",
  "Chemie",
  "Biologie",
  "Informatik",
  "Geschichte",
  "Geografie",
  "Erdkunde",
  "Politik",
  "Wirtschaft",
  "Kunst",
  "Musik",
  "Sport",
  "Religion",
  "Ethik",
  "Technik",
  "Werken",
  "Hauswirtschaft",
];

const STRENGTH_WORDS = [
  "teamfähig",
  "zuverlässig",
  "motiviert",
  "kreativ",
  "kommunikativ",
  "selbstständig",
  "fleißig",
  "organisiert",
  "hilfsbereit",
  "lernbereit",
  "pünktlich",
  "freundlich",
  "neugierig",
  "belastbar",
  "engagiert",
];

const LANGUAGE_PATTERNS: { label: string; patterns: RegExp[] }[] = [
  { label: "Deutsch", patterns: [/deutsch/i, /\bgerman\b/i] },
  { label: "Englisch", patterns: [/englisch/i, /\benglish\b/i] },
  { label: "Französisch", patterns: [/französisch/i, /franzoesisch/i, /french/i] },
  { label: "Spanisch", patterns: [/spanisch/i, /spanish/i] },
  { label: "Türkisch", patterns: [/türkisch/i, /tuerkisch/i, /turkish/i] },
  { label: "Arabisch", patterns: [/arabisch/i, /arabic/i] },
  { label: "Russisch", patterns: [/russisch/i, /russian/i] },
  { label: "Italienisch", patterns: [/italienisch/i, /italian/i] },
];

const SKILL_KEYWORDS = [
  "Word",
  "Excel",
  "PowerPoint",
  "Office",
  "Python",
  "Java",
  "HTML",
  "CSS",
  "JavaScript",
  "Scratch",
  "Photoshop",
  "Canva",
  "Führerschein",
  "Erste Hilfe",
  "CAD",
  "Arduino",
  "Raspberry",
  "Video",
  "Fotografie",
];

function uniquePreserve(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function extractName(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (
      line.length > 3 &&
      line.length < 60 &&
      !/lebenslauf|curriculum|schule|klasse|email|@|tel|straße|strasse/i.test(
        line,
      ) &&
      /^[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+){1,3}$/.test(line)
    ) {
      return line;
    }
  }
  return "";
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  // Kurze Überschriftenzeilen, ggf. mit Doppelpunkt
  return /^(kenntnisse|fähigkeiten|faehigkeiten|skills|edv|it[- ]kenntnisse|hobbys?|interessen|freizeit|praktika|praktikum|berufserfahrung|bisherige\s+praktika|sprachen|stärken|staerken|persönliche\s+eigenschaften|persoenliche\s+eigenschaften|soft\s*skills|bildung|schule|schul[fäa]cher|persönlich|persoenlich)[:\s]*$/i.test(
    trimmed,
  );
}

function extractSection(text: string, headers: RegExp[]): string {
  const lines = text.split(/\r?\n/);
  let collecting = false;
  const collected: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (headers.some((h) => h.test(trimmed)) && isSectionHeader(trimmed)) {
      collecting = true;
      continue;
    }
    if (collecting) {
      if (isSectionHeader(trimmed) && !headers.some((h) => h.test(trimmed))) {
        break;
      }
      if (trimmed) collected.push(trimmed);
    }
  }
  return collected.join("\n");
}

function extractListFromBlob(blob: string): string[] {
  return uniquePreserve(
    blob
      .split(/[,;•·|\n\/]+/)
      .map((s) => s.replace(/^[-–—*]\s*/, "").trim())
      .filter((s) => s.length > 1 && s.length < 80),
  );
}

export function parseCvText(rawText: string): StudentProfile {
  const text = rawText.replace(/\u00a0/g, " ").trim();
  const lower = text.toLowerCase();

  const schoolSubjects = SUBJECTS.filter((s) =>
    new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
      text,
    ),
  );

  const strengthsFromWords = STRENGTH_WORDS.filter((w) =>
    lower.includes(w.toLowerCase()),
  ).map((w) => w.charAt(0).toUpperCase() + w.slice(1));

  const strengthSection = extractSection(text, [
    /^stärken/i,
    /^staerken/i,
    /^persönliche\s+eigenschaften/i,
    /^soft\s*skills/i,
  ]);
  const strengths = uniquePreserve([
    ...strengthsFromWords,
    ...extractListFromBlob(strengthSection),
  ]);

  const languages = LANGUAGE_PATTERNS.filter((lang) =>
    lang.patterns.some((p) => p.test(text)),
  ).map((l) => l.label);

  const skillsSection = extractSection(text, [
    /^kenntnisse/i,
    /^fähigkeiten/i,
    /^faehigkeiten/i,
    /^skills/i,
    /^edv/i,
    /^it[- ]kenntnisse/i,
  ]);
  const skills = uniquePreserve([
    ...SKILL_KEYWORDS.filter((k) =>
      new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text),
    ),
    ...extractListFromBlob(skillsSection).slice(0, 12),
  ]);

  const hobbySection = extractSection(text, [
    /^hobbys?/i,
    /^interessen/i,
    /^freizeit/i,
  ]);
  const hobbies = extractListFromBlob(hobbySection).slice(0, 10);

  const internshipSection = extractSection(text, [
    /^praktika/i,
    /^praktikum/i,
    /^berufserfahrung/i,
    /^bisherige\s+praktika/i,
  ]);
  const previousInternships = extractListFromBlob(internshipSection).slice(
    0,
    8,
  );

  const suggestedFields = suggestFieldsFromText(
    [
      text,
      schoolSubjects.join(" "),
      skills.join(" "),
      hobbies.join(" "),
      previousInternships.join(" "),
    ].join(" "),
  );

  return {
    name: extractName(text),
    schoolSubjects,
    strengths,
    languages,
    skills,
    hobbies,
    previousInternships,
    rawTextExcerpt: text.slice(0, 1200),
    suggestedFields,
  };
}

export function emptyProfile(): StudentProfile {
  return {
    name: "",
    schoolSubjects: [],
    strengths: [],
    languages: ["Deutsch"],
    skills: [],
    hobbies: [],
    previousInternships: [],
    rawTextExcerpt: "",
    suggestedFields: [],
  };
}
