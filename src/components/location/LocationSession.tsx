"use client";

import { useEffect, useState } from "react";
import { distanceKm } from "@/lib/data/feed";
import { getMyProfile, updateMyLocation } from "@/lib/api/profile";

const SESSION_KEY = "arena_location_session";
/** Farther than the stored approximation, so a small jitter does not rewrite the profile. */
const MOVE_KM = 2;

/** Asks once each time Arena is opened. The exact reading is sent to the server, which stores
 *  only an approximate area, and is never written to this device. */
export function LocationSession() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        getMyProfile()
          .then((profile) => {
            const km = distanceKm({ lat: profile.approxLat, lng: profile.approxLng }, next);
            if (km != null && km < MOVE_KM) return null;
            return updateMyLocation({ consent: "precise", lat: next.lat, lng: next.lng });
          })
          .then((saved) => {
            if (saved) window.dispatchEvent(new Event("arena-location"));
          })
          .catch(() => {
            /* A failed save leaves the previous approximate area in place. */
          });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setBlocked(true);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 },
    );
  }, []);

  if (!blocked) return null;
  return (
    <p role="status" className="mb-3 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[14px] leading-relaxed text-foreground">
      <span>Location is blocked for Arena. Open your browser menu, choose site settings for this site, allow Location, then reopen Arena.</span>
      <button type="button" onClick={() => setBlocked(false)} className="shrink-0 font-semibold text-foreground underline underline-offset-4">Dismiss</button>
    </p>
  );
}
