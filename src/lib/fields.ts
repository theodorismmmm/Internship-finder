import type { CareerField, CareerFieldId } from "./types";

export const CAREER_FIELDS: CareerField[] = [
  {
    id: "technik",
    label: "Technik / Elektronik",
    keywords: [
      "technik",
      "elektronik",
      "mechatronik",
      "elektrotechnik",
      "ingenieur",
      "roboter",
      "automation",
      "industrie",
    ],
    osmTags: ['"craft"="electronics"', '"industrial"', '"office"="company"'],
  },
  {
    id: "it",
    label: "IT / Programmieren",
    keywords: [
      "informatik",
      "programmieren",
      "software",
      "it",
      "computer",
      "coding",
      "web",
      "python",
      "java",
      "digital",
      "daten",
    ],
    osmTags: ['"office"="it"', '"office"="company"'],
  },
  {
    id: "kfz",
    label: "KFZ / Fahrzeugtechnik",
    keywords: [
      "kfz",
      "auto",
      "fahrzeug",
      "werkstatt",
      "mechaniker",
      "mobilitaet",
      "verkehr",
    ],
    osmTags: ['"shop"="car"', '"shop"="car_repair"', '"craft"="car_repair"'],
  },
  {
    id: "luftfahrt",
    label: "Luftfahrt",
    keywords: [
      "luftfahrt",
      "flugzeug",
      "airport",
      "flughafen",
      "pilot",
      "aviation",
      "flug",
    ],
    osmTags: ['"aeroway"', '"office"="airline"'],
  },
  {
    id: "medizin",
    label: "Medizin / Gesundheit",
    keywords: [
      "medizin",
      "gesundheit",
      "pflege",
      "krankenhaus",
      "arzt",
      "apotheke",
      "biologie",
      "labor",
      "therapie",
    ],
    osmTags: [
      '"amenity"="hospital"',
      '"amenity"="clinic"',
      '"amenity"="doctors"',
      '"amenity"="pharmacy"',
    ],
  },
  {
    id: "handwerk",
    label: "Handwerk",
    keywords: [
      "handwerk",
      "schreiner",
      "tischler",
      "maler",
      "sanitaer",
      "elektro",
      "bau",
      "werkzeug",
    ],
    osmTags: ['"craft"', '"shop"="hardware"'],
  },
  {
    id: "buero",
    label: "Büro / Verwaltung",
    keywords: [
      "buero",
      "büro",
      "verwaltung",
      "office",
      "verwaltung",
      "sekretariat",
      "wirtschaft",
      "kaufmann",
      "kauffrau",
      "buchhaltung",
    ],
    osmTags: ['"office"="government"', '"office"="administrative"'],
  },
  {
    id: "naturwissenschaften",
    label: "Naturwissenschaften",
    keywords: [
      "chemie",
      "physik",
      "biologie",
      "labor",
      "forschung",
      "wissenschaft",
      "umwelt",
      "nachhaltigkeit",
    ],
    osmTags: ['"amenity"="research_institute"', '"office"="research"'],
  },
  {
    id: "soziales",
    label: "Soziales / Pädagogik",
    keywords: [
      "sozial",
      "paedagogik",
      "pädagogik",
      "erziehung",
      "kita",
      "schule",
      "jugend",
      "betreuung",
    ],
    osmTags: [
      '"amenity"="kindergarten"',
      '"amenity"="school"',
      '"amenity"="social_facility"',
    ],
  },
  {
    id: "medien",
    label: "Medien / Design",
    keywords: [
      "medien",
      "design",
      "grafik",
      "foto",
      "film",
      "journalismus",
      "kommunikation",
      "marketing",
      "kunst",
    ],
    osmTags: ['"craft"="photographer"', '"office"="advertising"'],
  },
  {
    id: "handel",
    label: "Handel / Einzelhandel",
    keywords: ["handel", "verkauf", "laden", "einzelhandel", "retail", "shop"],
    osmTags: ['"shop"="supermarket"', '"shop"="mall"'],
  },
  {
    id: "gastronomie",
    label: "Gastronomie / Hotellerie",
    keywords: [
      "gastronomie",
      "hotel",
      "kueche",
      "küche",
      "restaurant",
      "koch",
      "service",
      "tourismus",
    ],
    osmTags: [
      '"amenity"="restaurant"',
      '"tourism"="hotel"',
      '"amenity"="cafe"',
    ],
  },
];

export function getFieldById(id: CareerFieldId): CareerField | undefined {
  return CAREER_FIELDS.find((f) => f.id === id);
}

export function suggestFieldsFromText(text: string): CareerFieldId[] {
  const lower = text.toLowerCase();
  const scored = CAREER_FIELDS.map((field) => {
    const hits = field.keywords.filter((kw) => lower.includes(kw.toLowerCase()));
    return { id: field.id, score: hits.length };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 4).map((x) => x.id);
}

export function fieldSearchTerms(fields: CareerFieldId[]): string[] {
  const terms: string[] = [];
  for (const id of fields) {
    const field = getFieldById(id);
    if (!field) continue;
    terms.push(field.label.split(" / ")[0]);
    terms.push(...field.keywords.slice(0, 3));
  }
  return Array.from(new Set(terms));
}
