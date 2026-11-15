"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { hakadoriLevel, spotBounds, spotRadius, type MapSpot } from "@/lib/placeMap";

// OpenStreetMap ＋ Leaflet の地図（段階14）。無料・キー不要。出典の表示は必ず残す。
// ブラウザでしか動かないので、MapScreen から next/dynamic（ssr: false）で読み込む

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function popupHtml(spot: MapSpot): string {
  const level = hakadoriLevel(spot.hakadori);
  const rows = [
    `<strong>${escapeHtml(level.label)}</strong>`,
    `日記 ${spot.count} 日（はかどった日 ${spot.productiveDays} 日）`,
    spot.avgMood !== null ? `平均の気分 ${spot.avgMood}・集中 ${spot.avgFocus}` : null,
    `最後に書いた日：${escapeHtml(spot.dates.at(-1) ?? "")}`,
  ].filter(Boolean);
  return `<div style="font-size:13px;line-height:1.6">${rows.join("<br>")}</div>`;
}

export default function LeafletMap({ spots }: { spots: MapSpot[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

    for (const spot of spots) {
      const level = hakadoriLevel(spot.hakadori);
      L.circleMarker([spot.lat, spot.lng], {
        radius: spotRadius(spot.count),
        color: "#ffffff",
        weight: 2,
        fillColor: level.color,
        fillOpacity: 0.85,
      })
        .bindPopup(popupHtml(spot))
        .addTo(map);
    }

    const bounds = spotBounds(spots);
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    else map.setView([35.681, 139.767], 12);

    return () => {
      map.remove();
    };
  }, [spots]);

  return <div ref={container} className="h-[360px] w-full overflow-hidden rounded-[var(--radius)] border border-border" role="region" aria-label="はかどり場所マップ" />;
}
