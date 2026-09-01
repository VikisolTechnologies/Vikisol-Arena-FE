"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import type { Post } from "@/lib/types";

// Dormant unless NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set - /map/page.tsx falls back to the
// existing MapRadarScene (stylized 3D radar) otherwise, so nothing regresses for anyone who
// hasn't provisioned a key. Real Google Maps tiles, but plots the exact same already-jittered
// approxLat/approxLng every post and profile already carries (see lib/geo.ts's own comment on
// why that math is public-safe) - a real map here is NOT a privacy regression versus the radar;
// both render identically privacy-safe, already-approximate coordinates, just with different
// visuals. Never plots a raw device coordinate, same guarantee as MapRadarScene.
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Ambient window.google/initArenaMap shape lives in lib/google-global.d.ts - shared with
// GoogleSignInButton so the two components' `declare global` blocks don't conflict.

export function googleMapsConfigured(): boolean {
  return !!API_KEY;
}

export function GoogleMapView({
  posts, centerLat, centerLng, radiusKm, selectedId, onSelect,
}: {
  posts: Post[];
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement | google.maps.Marker>>(new Map());
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!API_KEY) return;
    const init = () => {
      if (!window.google || !containerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = new window.google.maps.Map(containerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: radiusKm <= 2 ? 13 : radiusKm <= 5 ? 12 : radiusKm <= 10 ? 11 : 9,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [{ elementType: "labels.icon", stylers: [{ visibility: "off" }] }],
        });
      } else {
        mapRef.current.setCenter({ lat: centerLat, lng: centerLng });
      }
      const map = mapRef.current;

      // Clear markers that no longer correspond to a visible post before redrawing.
      markersRef.current.forEach((marker, id) => {
        if (!posts.some((p) => p.id === id)) {
          if ("setMap" in marker) marker.setMap(null);
          markersRef.current.delete(id);
        }
      });

      if (!circleRef.current) {
        circleRef.current = new window.google.maps.Circle({
          map,
          center: { lat: centerLat, lng: centerLng },
          radius: radiusKm * 1000,
          strokeColor: "#FF6B35",
          strokeOpacity: 0.25,
          strokeWeight: 1,
          fillColor: "#FF6B35",
          fillOpacity: 0.04,
        });
      } else {
        circleRef.current.setCenter({ lat: centerLat, lng: centerLng });
        circleRef.current.setRadius(radiusKm * 1000);
      }

      for (const post of posts) {
        if (post.approxLat == null || post.approxLng == null) continue;
        const isSelected = post.id === selectedId;
        let marker = markersRef.current.get(post.id) as google.maps.Marker | undefined;
        const position = { lat: post.approxLat, lng: post.approxLng };
        const icon = {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 11 : 8,
          fillColor: post.intentType === "activity" ? "#FF6B35" : "#7DD3FC",
          fillOpacity: 1,
          strokeColor: isSelected ? "#FFFFFF" : "#0b0b0d",
          strokeWeight: isSelected ? 3 : 2,
        };
        if (!marker) {
          marker = new window.google.maps.Marker({ map, position, title: post.authorName, icon, zIndex: isSelected ? 999 : undefined });
          marker.addListener("click", () => onSelect(post.id === selectedId ? null : post.id));
          markersRef.current.set(post.id, marker);
        } else {
          marker.setPosition(position);
          marker.setIcon(icon);
          marker.setZIndex(isSelected ? 999 : undefined);
        }
      }
    };
    if (window.google) init();
    else {
      window.initArenaMap = init;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, centerLat, centerLng, radiusKm, selectedId]);

  if (!API_KEY) return null;

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initArenaMap&libraries=marker`}
        strategy="afterInteractive"
        onLoad={() => window.initArenaMap?.()}
      />
      <div ref={containerRef} className="size-full" />
    </>
  );
}
