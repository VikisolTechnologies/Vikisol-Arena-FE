/** Haversine distance in km - client-side only, mirrors GeohashUtil.distanceKm on the backend
 * (both operate on already-jittered/approximate coordinates, never a raw device point). Used by
 * the Feed/Map's "nearby" views to show/sort by distance since neither PostResponse nor the
 * nearby-search endpoint sends a precomputed distance - the viewer's own approxLat/approxLng
 * (from their profile) and each post's approxLat/approxLng are both already public-safe to do
 * this math with entirely in the browser. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing in degrees (0 = north, clockwise) from point 1 to point 2 - feeds the Map screen's
 * radar visualization (bearing + distance -> local x/z on a tilted 3D plane, see DECISIONS.md's
 * "Map screen is a stylized relative-position visualization" entry). */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Small random jitter for mock-mode "approx" coordinates (~±150m) - mirrors the backend's own
 * independent display-time jitter (GeohashUtil.jitter) closely enough for a local demo; there's
 * no real privacy boundary to protect here since mock data never leaves the browser. */
export function jitterCoord(lat: number, lng: number, maxMeters = 150): { lat: number; lng: number } {
  const metersToDeg = 1 / 111_000;
  return {
    lat: lat + (Math.random() - 0.5) * maxMeters * metersToDeg,
    lng: lng + (Math.random() - 0.5) * maxMeters * metersToDeg,
  };
}

/** Self-attested adult check - mirrors AgeUtil.isAdult on the backend exactly (see
 * DECISIONS.md's age-gating entry: real, working, minor-blocking logic, not fraud-proof). Used
 * by mock-mode post creation/joining so the demo path enforces the same rule the real backend
 * does, not a weaker stand-in. */
export function isAdult(dateOfBirth: string | undefined): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 18;
}
