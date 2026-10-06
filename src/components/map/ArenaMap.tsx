"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

/** OpenFreeMap vector tiles: free, no API key, OpenStreetMap data (architect decision 30 Sep). */
export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

/** Our dark tokens applied to the OpenFreeMap "dark" style, by layer role. */
const PAINT: { match: (id: string) => boolean; props: Record<string, unknown> }[] = [
  { match: (id) => id === "background", props: { "background-color": "#1a1f1d" } },
  { match: (id) => id === "water", props: { "fill-color": "#15303a" } },
  { match: (id) => id.startsWith("waterway"), props: { "line-color": "#1d3a46" } },
  { match: (id) => id === "landcover_wood" || id === "landuse_park", props: { "fill-color": "#1e2c23", "fill-opacity": 0.9 } },
  { match: (id) => id === "landuse_residential", props: { "fill-color": "#1d2321", "fill-opacity": 0.6 } },
  { match: (id) => id === "building", props: { "fill-color": "#232a28" } },
  { match: (id) => id === "highway_path" || id === "highway_minor", props: { "line-color": "#343d3a" } },
  { match: (id) => id.includes("casing"), props: { "line-color": "#1a1f1d" } },
  { match: (id) => id === "highway_major_inner" || id === "highway_major_subtle", props: { "line-color": "#4a5551" } },
  { match: (id) => id === "highway_motorway_inner" || id === "highway_motorway_subtle", props: { "line-color": "#5d6964" } },
];
const LABEL = { "text-color": "#b8aca2", "text-halo-color": "#16110f", "text-halo-width": 1.4 };

const PIN_BG: Record<string, string> = { activity: "#3b82f6", ask: "#ff5a1f", offer: "#2f9e5b" };

/** A circle polygon (the approximate "You" area), `km` in radius. */
function circle(lat: number, lng: number, km: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    pts.push([lng + (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a), lat + (km / 110.57) * Math.sin(a)]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [pts] } };
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The live Discover map: MapLibre GL + OpenFreeMap tiles, restyled to our dark tokens, with the
 * approximate "You" ring and a tappable pin per nearby item. Calls `onFail` (so the caller can show
 * the static fallback) when WebGL is missing, the style or tiles error before the first render,
 * or nothing has rendered after 8 s. One-finger scroll keeps scrolling the page
 * (cooperative gestures); two fingers move the map.
 */
export function ArenaMap({
  center,
  you,
  ringKm,
  posts,
  selected,
  onSelect,
  onFail,
}: {
  center: { lat: number; lng: number };
  you: boolean;
  ringKm: number;
  posts: Post[];
  selected: string | null;
  onSelect: (id: string) => void;
  onFail: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<{ marker: Marker; root: Root }[]>([]);
  const [ready, setReady] = useState(false);
  const failRef = useRef(onFail);
  const selectRef = useRef(onSelect);
  useEffect(() => {
    failRef.current = onFail;
    selectRef.current = onSelect;
  });

  // Create the map once.
  useEffect(() => {
    if (!box.current) return;
    if (!webglAvailable()) {
      failRef.current();
      return;
    }
    let disposed = false;
    let loaded = false;
    const fail = () => {
      if (!loaded && !disposed) failRef.current();
    };
    const timer = window.setTimeout(fail, 8000);
    let instance: MLMap | null = null;
    import("maplibre-gl")
      .then((maplibregl) => {
        if (disposed || !box.current) return;
        // Served from public/ (scripts/dev/copy-maplibre-worker.mjs), versioned to the library.
        maplibregl.setWorkerUrl(`/vendor/maplibre/${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const created = new maplibregl.Map({
          container: box.current,
          style: OPENFREEMAP_STYLE,
          center: [center.lng, center.lat],
          zoom: 12.2,
          minZoom: 10,
          maxZoom: 16,
          attributionControl: false,
          cooperativeGestures: true,
          fadeDuration: reduce ? 0 : 300,
          pitchWithRotate: false,
          dragRotate: false,
        });
        instance = created;
        created.touchZoomRotate.disableRotation();
        created.on("error", fail);
        created.on("load", () => {
          const m = created;
          for (const layer of m.getStyle().layers ?? []) {
            if (layer.type === "symbol") {
              for (const [k, v] of Object.entries(LABEL)) {
                try {
                  m.setPaintProperty(layer.id, k as never, v as never);
                } catch {
                  /* layer without text */
                }
              }
              continue;
            }
            const rule = PAINT.find((r) => r.match(layer.id));
            if (rule) for (const [k, v] of Object.entries(rule.props)) m.setPaintProperty(layer.id, k as never, v as never);
          }
          m.addSource("you", { type: "geojson", data: circle(center.lat, center.lng, ringKm) });
          m.addLayer({ id: "you-fill", type: "fill", source: "you", paint: { "fill-color": "#3b82f6", "fill-opacity": 0.16 } });
          m.addLayer({ id: "you-line", type: "line", source: "you", paint: { "line-color": "#7aa7ff", "line-opacity": 0.5, "line-width": 1 } });
        });
        created.once("idle", () => {
          loaded = true;
          window.clearTimeout(timer);
          if (!disposed) setReady(true);
        });
        map.current = created;
      })
      .catch(fail);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      for (const { marker, root } of markers.current) {
        marker.remove();
        queueMicrotask(() => root.unmount());
      }
      markers.current = [];
      instance?.remove();
      map.current = null;
    };
    // The map is created once per centre; pins update below.
  }, [center.lat, center.lng, ringKm]);

  // "You" marker + pins, redrawn when the list or selection changes.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    let cancelled = false;
    import("maplibre-gl").then((maplibregl) => {
      if (cancelled) return;
      for (const { marker, root } of markers.current) {
        marker.remove();
        queueMicrotask(() => root.unmount());
      }
      markers.current = [];
      const add = (lng: number, lat: number, node: React.ReactNode, anchor: "bottom" | "center") => {
        const el = document.createElement("div");
        const root = createRoot(el);
        root.render(node);
        markers.current.push({ marker: new maplibregl.Marker({ element: el, anchor }).setLngLat([lng, lat]).addTo(m), root });
      };
      add(
        center.lng,
        center.lat,
        <span aria-hidden className="flex flex-col items-center">
          <span className="size-4 rounded-full bg-[#3b82f6] ring-4 ring-white/85" />
          <span className="mt-1 whitespace-nowrap text-center text-[12px] font-medium leading-tight text-white [text-shadow:0_1px_4px_#000]">
            {you ? "You" : "Gachibowli"}
            <br />
            <span className="text-white/75">{you ? "(approximate)" : "(launch area)"}</span>
          </span>
        </span>,
        "center",
      );
      for (const p of posts) {
        if (p.approxLat == null || p.approxLng == null) continue;
        const on = p.id === selected;
        add(
          p.approxLng,
          p.approxLat,
          <button
            type="button"
            aria-label={p.title || "Open this place"}
            aria-pressed={on}
            onClick={() => selectRef.current(p.id)}
            className="grid size-11 place-items-center outline-none focus-visible:outline-2 focus-visible:outline-white"
          >
            <span className={cn("grid size-8 rotate-45 place-items-center rounded-full rounded-br-none shadow-lg ring-2 transition-transform duration-200 motion-reduce:transition-none", on ? "scale-110 ring-white" : "ring-black/30")} style={{ background: PIN_BG[p.intentType] ?? "#f2a93b" }}>
              <span className="size-2.5 -rotate-45 rounded-full bg-white" />
            </span>
          </button>,
          "bottom",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [posts, selected, ready, center.lat, center.lng, you]);

  return (
    <div className="relative aspect-[3/4] w-full bg-[#1a1f1d]">
      <div ref={box} className="!absolute inset-0" aria-label="Map of nearby activities, needs and offers" role="region" />
      {!ready && <div aria-hidden className="absolute inset-0 animate-pulse bg-[#1a1f1d] motion-reduce:animate-none" />}
      {/* Required credit for the tiles and data (small, always visible). */}
      <p className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/85">
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">OpenFreeMap</a> ©{" "}
        <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">OpenMapTiles</a> ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">OpenStreetMap contributors</a>
      </p>
    </div>
  );
}
