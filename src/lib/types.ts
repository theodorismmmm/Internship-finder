export type CareerFieldId =
  | "technik"
  | "it"
  | "kfz"
  | "luftfahrt"
  | "medizin"
  | "handwerk"
  | "buero"
  | "naturwissenschaften"
  | "soziales"
  | "medien"
  | "handel"
  | "gastronomie";

export interface CareerField {
  id: CareerFieldId;
  label: string;
  keywords: string[];
  osmTags: string[];
}

export interface StudentProfile {
  name: string;
  schoolSubjects: string[];
  strengths: string[];
  languages: string[];
  skills: string[];
  hobbies: string[];
  previousInternships: string[];
  rawTextExcerpt: string;
  suggestedFields: CareerFieldId[];
}

export interface MapCenter {
  lat: number;
  lon: number;
  label: string;
}

export type OfferSource = "ba" | "osm";

export type DifficultyLevel = "leicht" | "mittel" | "schwer";

export interface TravelEstimates {
  distanceKm: number;
  walkMinutes: number;
  bikeMinutes: number;
  transitMinutes: number;
}

export interface OfferScore {
  matchPercent: number;
  difficulty: DifficultyLevel;
  matchReasons: string[];
  difficultyReasons: string[];
}

export interface InternshipOffer {
  id: string;
  source: OfferSource;
  title: string;
  company: string;
  description: string;
  locationLabel: string;
  lat: number;
  lon: number;
  distanceKm: number;
  url: string | null;
  referenceNumber?: string;
  professions: string[];
  fieldHints: CareerFieldId[];
  isInitiative: boolean;
  publishedAt?: string;
  score: OfferScore;
  travel: TravelEstimates;
}

export type SortKey = "match" | "difficulty" | "distance";

export interface SearchParams {
  center: MapCenter;
  radiusKm: number;
  fields: CareerFieldId[];
  profile: StudentProfile | null;
  includeOsm: boolean;
}
