"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MemberLocation } from "@fetchlocation/shared";
import { MAP_STYLE_URL } from "../config";

export function MapView({ members }: { members: MemberLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [0, 0],
      zoom: 2,
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const withPing = members.filter((m) => m.ping);
    const seenIds = new Set<string>();

    withPing.forEach(({ user, ping }) => {
      seenIds.add(user.id);
      const lngLat: [number, number] = [ping!.lng, ping!.lat];
      const existing = markersRef.current[user.id];
      if (existing) {
        existing.setLngLat(lngLat);
      } else {
        const el = document.createElement("div");
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.borderRadius = "50%";
        el.style.background = "#2563eb";
        el.style.border = "2px solid white";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.color = "white";
        el.style.fontWeight = "700";
        el.textContent = user.name.slice(0, 1).toUpperCase();

        const marker = new maplibregl.Marker(el)
          .setLngLat(lngLat)
          .setPopup(new maplibregl.Popup({ offset: 20 }).setText(user.name))
          .addTo(map);
        markersRef.current[user.id] = marker;
      }
    });

    Object.keys(markersRef.current).forEach((userId) => {
      if (!seenIds.has(userId)) {
        markersRef.current[userId].remove();
        delete markersRef.current[userId];
      }
    });

    if (withPing.length && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      map.setCenter([withPing[0].ping!.lng, withPing[0].ping!.lat]);
      map.setZoom(12);
    }
  }, [members]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
