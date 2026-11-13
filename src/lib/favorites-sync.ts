import type { InternshipOffer } from "./types";
import { getDeviceId, getSupabaseBrowserClient } from "./supabase";

/** Optional: Merkliste zusätzlich in Supabase spiegeln (lokal bleibt Quelle). */
export async function syncFavoritesToSupabase(
  offers: InternshipOffer[],
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const deviceId = getDeviceId();
  const { error: delError } = await supabase
    .from("favorites")
    .delete()
    .eq("device_id", deviceId);
  if (delError) {
    console.warn("Supabase favorites delete:", delError.message);
    return;
  }

  if (offers.length === 0) return;

  const rows = offers.map((offer) => ({
    device_id: deviceId,
    offer_id: offer.id,
    offer,
  }));

  const { error } = await supabase.from("favorites").insert(rows);
  if (error) console.warn("Supabase favorites insert:", error.message);
}

export async function loadFavoritesFromSupabase(): Promise<InternshipOffer[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from("favorites")
    .select("offer")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.warn("Supabase favorites load:", error.message);
    return [];
  }

  return data
    .map((row) => row.offer as InternshipOffer)
    .filter(Boolean);
}
