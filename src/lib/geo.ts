import type { TravelEstimates } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Geschätzte Fahrzeiten anhand typischer Durchschnittsgeschwindigkeiten (Heuristik). */
export function estimateTravel(distanceKm: number): TravelEstimates {
  const walkSpeed = 4.5; // km/h
  const bikeSpeed = 14;
  const transitSpeed = 18; // inkl. Wartezeiten grob
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    walkMinutes: Math.round((distanceKm / walkSpeed) * 60),
    bikeMinutes: Math.round((distanceKm / bikeSpeed) * 60),
    transitMinutes: Math.round((distanceKm / transitSpeed) * 60 + 8),
  };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`;
}
