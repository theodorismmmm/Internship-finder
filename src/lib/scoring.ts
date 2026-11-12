import { CAREER_FIELDS, getFieldById } from "./fields";
import type {
  CareerFieldId,
  DifficultyLevel,
  InternshipOffer,
  OfferScore,
  StudentProfile,
} from "./types";

const WELL_KNOWN = [
  "siemens",
  "bmw",
  "mercedes",
  "volkswagen",
  "vw",
  "bosch",
  "sap",
  "deutsche bahn",
  "lufthansa",
  "adidas",
  "allianz",
  "telekom",
  "bayer",
  "basf",
  "infineon",
  "continental",
  "porsche",
  "audi",
  "google",
  "microsoft",
  "amazon",
  "ibm",
  "thyssenkrupp",
  "rwe",
  "e.on",
  "roche",
  "novartis",
  "siemens healthineers",
];

function tokenize(...parts: string[]): string[] {
  return parts
    .join(" ")
    .toLowerCase()
    .split(/[^a-zäöüß0-9+#.]+/i)
    .filter((t) => t.length > 2);
}

export function inferFieldsFromOffer(
  title: string,
  description: string,
  professions: string[],
): CareerFieldId[] {
  const blob = [title, description, ...professions].join(" ").toLowerCase();
  return CAREER_FIELDS.filter((f) =>
    f.keywords.some((kw) => blob.includes(kw.toLowerCase())),
  ).map((f) => f.id);
}

export function scoreOffer(input: {
  title: string;
  company: string;
  description: string;
  professions: string[];
  fieldHints: CareerFieldId[];
  selectedFields: CareerFieldId[];
  profile: StudentProfile | null;
  isInitiative: boolean;
}): OfferScore {
  const {
    title,
    company,
    description,
    professions,
    fieldHints,
    selectedFields,
    profile,
    isInitiative,
  } = input;

  const matchReasons: string[] = [];
  const difficultyReasons: string[] = [];
  let match = 35;

  const overlappingFields = selectedFields.filter((f) =>
    fieldHints.includes(f),
  );
  if (overlappingFields.length > 0) {
    match += Math.min(35, overlappingFields.length * 15);
    matchReasons.push(
      `Passt zu gewähltem Bereich: ${overlappingFields
        .map((id) => getFieldById(id)?.label ?? id)
        .join(", ")}`,
    );
  } else if (selectedFields.length > 0) {
    match -= 10;
    matchReasons.push(
      "Kein klarer Treffer zu den gewählten Berufsfeldern (nur grobe Schätzung)",
    );
  }

  if (profile) {
    const profileTokens = new Set(
      tokenize(
        ...profile.schoolSubjects,
        ...profile.skills,
        ...profile.strengths,
        ...profile.hobbies,
        ...profile.languages,
        ...profile.previousInternships,
        profile.rawTextExcerpt,
      ),
    );
    const offerTokens = tokenize(title, description, ...professions);
    const hits = offerTokens.filter((t) => profileTokens.has(t));
    const uniqueHits = Array.from(new Set(hits)).slice(0, 8);
    if (uniqueHits.length > 0) {
      match += Math.min(25, uniqueHits.length * 4);
      matchReasons.push(
        `Gemeinsame Stichworte mit dem Profil: ${uniqueHits.join(", ")}`,
      );
    } else {
      matchReasons.push(
        "Wenige direkte Überschneidungen mit dem Lebenslauf-Text",
      );
    }

    if (
      profile.previousInternships.length > 0 &&
      /praktikum|erfahrung/i.test(description + title)
    ) {
      match += 5;
      matchReasons.push("Bisherige Praktika können als Plus wirken");
    }
  } else {
    matchReasons.push(
      "Kein Lebenslauf hinterlegt – Passung nur über gewählte Bereiche",
    );
  }

  if (isInitiative) {
    match = Math.max(20, match - 8);
    matchReasons.push(
      "Kein ausgeschriebenes Angebot (Initiativbewerbung) – Passung unsicherer",
    );
  }

  match = Math.max(0, Math.min(100, Math.round(match)));

  // Difficulty heuristic
  let difficultyPoints = 40;
  const companyLower = company.toLowerCase();
  const isFamous = WELL_KNOWN.some((n) => companyLower.includes(n));
  if (isFamous) {
    difficultyPoints += 30;
    difficultyReasons.push(
      "Bekanntes/großes Unternehmen – oft viele Bewerbungen",
    );
  }

  if (
    /gmbh|ag|se\b|konzern|international|gruppe|group/i.test(company) &&
    !isFamous
  ) {
    difficultyPoints += 10;
    difficultyReasons.push("Firmenform deutet auf etablierten Betrieb hin");
  }

  if (/e\.?\s*v\.|verein|handwerk|meisterbetrieb|familie/i.test(company)) {
    difficultyPoints -= 15;
    difficultyReasons.push(
      "Kleinerer Betrieb/Verein – Einstieg oft etwas leichter",
    );
  }

  const reqHits: string[] = [];
  if (/studium|student|hochschule|bachelor|master/i.test(description + title)) {
    difficultyPoints += 20;
    reqHits.push("Studium/Hochschule erwähnt");
  }
  if (/ausbildung|abgeschlossen|berufserfahrung|mehrjährig/i.test(description)) {
    difficultyPoints += 15;
    reqHits.push("Ausbildung/Berufserfahrung erwähnt");
  }
  if (/mindestalter|ab\s*1[6-9]|volljährig/i.test(description)) {
    difficultyPoints += 10;
    reqHits.push("Altersangabe in der Anzeige");
  }
  if (/Schüler|Schueler|schulpraktikum|betriebspraktikum|klasse/i.test(description + title)) {
    difficultyPoints -= 20;
    reqHits.push("Explizit für Schüler / Schulpraktikum");
  }
  if (reqHits.length) {
    difficultyReasons.push(`Anforderungen: ${reqHits.join("; ")}`);
  }

  if (isInitiative) {
    difficultyPoints += 5;
    difficultyReasons.push(
      "Initiativ – kein offenes Angebot, Erfolg hängt vom Betrieb ab",
    );
  }

  if (difficultyReasons.length === 0) {
    difficultyReasons.push(
      "Keine starken Signale – mittlere Standardannahme",
    );
  }

  let difficulty: DifficultyLevel = "mittel";
  if (difficultyPoints <= 35) difficulty = "leicht";
  else if (difficultyPoints >= 65) difficulty = "schwer";

  return {
    matchPercent: match,
    difficulty,
    matchReasons,
    difficultyReasons,
  };
}

export function difficultyRank(level: DifficultyLevel): number {
  return level === "leicht" ? 0 : level === "mittel" ? 1 : 2;
}

export function sortOffers(
  offers: InternshipOffer[],
  key: "match" | "difficulty" | "distance",
): InternshipOffer[] {
  const copy = [...offers];
  copy.sort((a, b) => {
    if (key === "match") return b.score.matchPercent - a.score.matchPercent;
    if (key === "difficulty")
      return difficultyRank(a.score.difficulty) - difficultyRank(b.score.difficulty);
    return a.distanceKm - b.distanceKm;
  });
  return copy;
}
