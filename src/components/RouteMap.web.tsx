import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import L from "leaflet";
import { LatLon, ScoreOut, SCORE_COLORS } from "../types";

// Inject Leaflet CSS once
const LEAFLET_CSS_ID = "leaflet-css";
if (typeof document !== "undefined" && !document.getElementById(LEAFLET_CSS_ID)) {
  const link = document.createElement("link");
  link.id = LEAFLET_CSS_ID;
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

interface Props {
  points: LatLon[];
  scores: ScoreOut[];
  onAddPoint: (point: LatLon) => void;
  onClearRoute: () => void;
  onUndoPoint: () => void;
}

const INITIAL_CENTER: [number, number] = [30.37, -88.8];
const INITIAL_ZOOM = 12;

export default function RouteMap({
  points,
  scores,
  onAddPoint,
  onClearRoute,
  onUndoPoint,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Esri", maxZoom: 19 }
    ).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle map clicks
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (e: L.LeafletMouseEvent) => {
      onAddPoint({ lat: e.latlng.lat, lon: e.latlng.lng });
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [onAddPoint]);

  // Redraw markers and lines when points/scores change
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    // Route line (before scoring)
    if (scores.length === 0 && points.length >= 2) {
      L.polyline(
        points.map((p) => [p.lat, p.lon] as [number, number]),
        { color: "#3b82f6", weight: 3 }
      ).addTo(layer);
    }

    // Score-colored segments
    if (scores.length >= 2) {
      for (let i = 0; i < scores.length - 1; i++) {
        const a = scores[i];
        const b = scores[i + 1];
        L.polyline(
          [
            [a.lat, a.lon],
            [b.lat, b.lon],
          ],
          { color: SCORE_COLORS[a.label], weight: 4 }
        ).addTo(layer);
      }
    }

    // Waypoint markers
    points.forEach((p, i) => {
      const color =
        i === 0 ? "#22c55e" : i === points.length - 1 ? "#ef4444" : "#3b82f6";
      L.circleMarker([p.lat, p.lon], {
        radius: 7,
        fillColor: color,
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      })
        .bindTooltip(`Point ${i + 1}: ${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`)
        .addTo(layer);
    });

    // Score dot markers
    scores.forEach((s) => {
      const bg = SCORE_COLORS[s.label];
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;border-radius:14px;
          background:${bg};border:2px solid #fff;
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:10px;font-weight:700;
        ">${Math.round(s.score_0_100)}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([s.lat, s.lon], { icon }).addTo(layer);
    });
  }, [points, scores]);

  return (
    <View style={styles.container}>
      {/* @ts-ignore - mixing DOM ref with RN View */}
      <div ref={containerRef} style={{ flex: 1, width: "100%", height: "100%" }} />

      {points.length > 0 && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.btn} onPress={onUndoPoint}>
            <Text style={styles.btnText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={onClearRoute}
          >
            <Text style={styles.btnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.hint}>
        <Text style={styles.hintText}>
          {points.length === 0
            ? "Click the map to add route points"
            : `${points.length} point${points.length > 1 ? "s" : ""} placed`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: {
    position: "absolute",
    top: 60,
    right: 12,
    gap: 8,
    zIndex: 1000,
  },
  btn: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnDanger: { backgroundColor: "rgba(180,30,30,0.8)" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  hint: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1000,
  },
  hintText: { color: "#fff", fontSize: 13 },
});
