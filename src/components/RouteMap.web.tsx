import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import L from "leaflet";
import { LatLon, ScoreOut, Report, REPORT_COLORS } from "../types";

/** Map score 0-100 to a continuous color: red → orange → yellow → green */
function scoreToColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  const hue = (s / 100) * 120;
  return `hsl(${hue}, 85%, 48%)`;
}

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
  reports?: Report[];
  onReportPress?: (report: Report) => void;
  initialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  showsUserLocation?: boolean;
  highlightedScoreIndex?: number | null;
}

const INITIAL_CENTER: [number, number] = [30.37, -88.8];
const INITIAL_ZOOM = 12;

export default function RouteMap({
  points,
  scores,
  onAddPoint,
  onClearRoute,
  onUndoPoint,
  reports = [],
  initialRegion,
  showsUserLocation,
  highlightedScoreIndex,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const hasSetViewRef = useRef(false);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = initialRegion
      ? [initialRegion.latitude, initialRegion.longitude]
      : INITIAL_CENTER;

    const map = L.map(containerRef.current, {
      center,
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

  // Re-center map when initialRegion arrives (once, before user has placed points)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initialRegion || hasSetViewRef.current) return;
    if (points.length === 0) {
      map.setView([initialRegion.latitude, initialRegion.longitude], INITIAL_ZOOM);
      hasSetViewRef.current = true;
    }
  }, [initialRegion]);

  // Show user location as a blue dot on web via browser geolocation
  useEffect(() => {
    if (!showsUserLocation || typeof navigator === "undefined" || !navigator.geolocation) return;
    const map = mapRef.current;
    if (!map) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          userMarkerRef.current = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: "#4285F4",
            color: "#fff",
            weight: 3,
            fillOpacity: 1,
          })
            .bindTooltip("You are here")
            .addTo(map);
        }
      },
      () => {},
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [showsUserLocation]);

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

  // Redraw markers and lines when points/scores/reports change
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

    // Score-colored gradient segments
    if (scores.length >= 2) {
      const STEPS = 8;
      for (let i = 0; i < scores.length - 1; i++) {
        const a = scores[i];
        const b = scores[i + 1];
        for (let step = 0; step < STEPS; step++) {
          const t0 = step / STEPS;
          const t1 = (step + 1) / STEPS;
          const tMid = (t0 + t1) / 2;
          const scoreMid = a.score_0_100 + (b.score_0_100 - a.score_0_100) * tMid;
          L.polyline(
            [
              [a.lat + (b.lat - a.lat) * t0, a.lon + (b.lon - a.lon) * t0],
              [a.lat + (b.lat - a.lat) * t1, a.lon + (b.lon - a.lon) * t1],
            ],
            { color: scoreToColor(scoreMid), weight: 4 }
          ).addTo(layer);
        }
      }
    }

    // Waypoint markers (hidden after scoring — route line is enough)
    if (scores.length === 0) {
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
    }

    // Score point markers — small dots, highlighted when selected
    scores.forEach((s, i) => {
      const bg = scoreToColor(s.score_0_100);
      const isActive = i === highlightedScoreIndex;
      const size = isActive ? 32 : 20;
      const half = size / 2;
      const border = isActive ? "3px solid #fff" : "1.5px solid rgba(255,255,255,0.7)";
      const fontSize = isActive ? 12 : 8;
      const shadow = isActive ? "box-shadow:0 0 8px rgba(255,255,255,0.6);" : "";
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:${half}px;
          background:${bg};border:${border};
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:${fontSize}px;font-weight:700;
          ${shadow}
        ">${Math.round(s.score_0_100)}</div>`,
        iconSize: [size, size],
        iconAnchor: [half, half],
      });
      L.marker([s.lat, s.lon], { icon, zIndexOffset: isActive ? 1000 : 0 }).addTo(layer);
    });

    // Report markers
    reports.forEach((r) => {
      const bg = REPORT_COLORS[r.report_type];
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:24px;height:24px;border-radius:12px;
          background:${bg};border:2px solid #fff;
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:12px;font-weight:700;
        ">!</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([r.lat, r.lon], { icon })
        .bindTooltip(`${r.report_type.replace("_", " ")}`)
        .addTo(layer);
    });
  }, [points, scores, reports, highlightedScoreIndex]);

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
