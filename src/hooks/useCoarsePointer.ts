"use client";

import { useSyncExternalStore } from "react";

// Dokunmatik birincil işaretçi (telefon, tablet). Sunucuda false döner;
// tarayıcıda medya sorgusu değişince (ör. tablete klavye takılınca) güncellenir.
const QUERY = "(pointer: coarse)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
