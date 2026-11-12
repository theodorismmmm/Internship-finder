import type { InternshipOffer, StudentProfile } from "./types";

const MERKLISTE_KEY = "praktikumsradar.merkliste.v1";
const PROFILE_KEY = "praktikumsradar.profile.v1";

export function loadMerkliste(): InternshipOffer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MERKLISTE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InternshipOffer[];
  } catch {
    return [];
  }
}

export function saveMerkliste(items: InternshipOffer[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MERKLISTE_KEY, JSON.stringify(items));
}

export function loadStoredProfile(): StudentProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudentProfile;
  } catch {
    return null;
  }
}

export function saveStoredProfile(profile: StudentProfile | null): void {
  if (typeof window === "undefined") return;
  if (!profile) {
    localStorage.removeItem(PROFILE_KEY);
    return;
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
