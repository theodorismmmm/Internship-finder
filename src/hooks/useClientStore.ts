"use client";

import { useSyncExternalStore } from "react";
import {
  loadMerkliste,
  loadStoredProfile,
  saveMerkliste,
  saveStoredProfile,
} from "@/lib/storage";
import type { InternshipOffer, StudentProfile } from "@/lib/types";

type Listener = () => void;

let merklisteCache: InternshipOffer[] | null = null;
let profileCache: StudentProfile | null | undefined = undefined;
const merklisteListeners = new Set<Listener>();
const profileListeners = new Set<Listener>();

function emit(listeners: Set<Listener>) {
  listeners.forEach((l) => l());
}

export function getMerkliste(): InternshipOffer[] {
  if (merklisteCache === null) {
    merklisteCache = loadMerkliste();
  }
  return merklisteCache;
}

export function setMerklisteStore(items: InternshipOffer[]) {
  merklisteCache = items;
  saveMerkliste(items);
  emit(merklisteListeners);
  // Optional Cloud-Sync (Supabase) – Fehler werden nur geloggt
  void import("@/lib/favorites-sync")
    .then(({ syncFavoritesToSupabase }) => syncFavoritesToSupabase(items))
    .catch(() => undefined);
}

export function getProfile(): StudentProfile | null {
  if (profileCache === undefined) {
    profileCache = loadStoredProfile();
  }
  return profileCache;
}

export function setProfileStore(profile: StudentProfile | null) {
  profileCache = profile;
  saveStoredProfile(profile);
  emit(profileListeners);
}

export function useMerkliste(): [
  InternshipOffer[],
  (items: InternshipOffer[] | ((prev: InternshipOffer[]) => InternshipOffer[])) => void,
] {
  const items = useSyncExternalStore(
    (onStoreChange) => {
      merklisteListeners.add(onStoreChange);
      return () => merklisteListeners.delete(onStoreChange);
    },
    getMerkliste,
    () => [],
  );

  function setItems(
    next: InternshipOffer[] | ((prev: InternshipOffer[]) => InternshipOffer[]),
  ) {
    const value = typeof next === "function" ? next(getMerkliste()) : next;
    setMerklisteStore(value);
  }

  return [items, setItems];
}

export function useStoredProfile(): [
  StudentProfile | null,
  (profile: StudentProfile | null) => void,
] {
  const profile = useSyncExternalStore(
    (onStoreChange) => {
      profileListeners.add(onStoreChange);
      return () => profileListeners.delete(onStoreChange);
    },
    getProfile,
    () => null,
  );

  return [profile, setProfileStore];
}
