import React, { useRef, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker, Polyline, MapPressEvent, Region } from "react-native-maps";
import { LatLon, ScoreOut, Report, REPORT_COLORS } from "../types";

interface Props {
  points: LatLon[];
  scores: ScoreOut[];
  onAddPoint: (point: LatLon) => void;
  onClearRoute: () => void;
  onUndoPoint: () => void;
  reports?: Report[];
  onReportPress?: (report: Report) => void;
  initialRegion?: Region;
  showsUserLocation?: boolean;
  highlightedScoreIndex?: number | null;
}

const INITIAL_REGION: Region = {
  latitude: 30.37,
  longitude: -88.8,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export default function RouteMap({
  points,
  scores,
  onAddPoint,
  onClearRoute,
  onUndoPoint,
  reports = [],
  onReportPress,
  initialRegion,
  showsUserLocation,
  highlightedScoreIndex,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const hasAnimated = useRef(false);

  // Animate to initialRegion when it arrives after mount (e.g. from profile or GPS)
  useEffect(() => {
    if (initialRegion && !hasAnimated.current && points.length === 0) {
      hasAnimated.current = true;
      mapRef.current?.animateToRegion(initialRegion, 500);
    }
  }, [initialRegion]);

  const handlePress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onAddPoint({ lat: latitude, lon: longitude });
  };

  const scoreSegments = buildScoreSegments(points, scores);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion ?? INITIAL_REGION}
        onPress={handlePress}
        mapType="hybrid"
        toolbarEnabled={false}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={showsUserLocation}
      >
        {/* Route waypoint markers (hidden after scoring — route line is enough) */}
        {scores.length === 0 && points.map((p, i) => (
          <Marker
            key={`wp-${i}`}
            coordinate={{ latitude: p.lat, longitude: p.lon }}
            pinColor={i === 0 ? "#22c55e" : i === points.length - 1 ? "#ef4444" : "#3b82f6"}
            title={`Point ${i + 1}`}
            description={`${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`}
          />
        ))}

        {/* Plain route line (before scoring) */}
        {scores.length === 0 && points.length >= 2 && (
          <Polyline
            coordinates={points.map((p) => ({
              latitude: p.lat,
              longitude: p.lon,
            }))}
            strokeColor="#3b82f6"
            strokeWidth={3}
          />
        )}

        {/* Score-colored segments */}
        {scoreSegments.map((seg, i) => (
          <Polyline
            key={`seg-${i}`}
            coordinates={seg.coords}
            strokeColor={seg.color}
            strokeWidth={4}
          />
        ))}

        {/* Score point markers — small dots, highlighted when selected */}
        {scores.map((s, i) => {
          const isActive = i === highlightedScoreIndex;
          return (
            <Marker
              key={`score-${i}`}
              coordinate={{ latitude: s.lat, longitude: s.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={isActive ? 10 : 1}
            >
              <View
                style={[
                  isActive ? styles.scoreDotActive : styles.scoreDot,
                  { backgroundColor: scoreToColor(s.score_0_100) },
                ]}
              >
                <Text style={isActive ? styles.scoreDotTextActive : styles.scoreDotText}>
                  {Math.round(s.score_0_100)}
                </Text>
              </View>
            </Marker>
          );
        })}

        {/* Report markers */}
        {reports.map((r) => (
          <Marker
            key={`report-${r.id}`}
            coordinate={{ latitude: r.lat, longitude: r.lon }}
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={() => onReportPress?.(r)}
          >
            <View
              style={[
                styles.reportDot,
                { backgroundColor: REPORT_COLORS[r.report_type] },
              ]}
            >
              <Text style={styles.reportDotText}>!</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Map controls overlay */}
      {points.length > 0 && (
        <View style={styles.controls} pointerEvents="box-none">
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

      <View style={styles.hint} pointerEvents="none">
        <Text style={styles.hintText}>
          {points.length === 0
            ? "Tap the map to add route points"
            : `${points.length} point${points.length > 1 ? "s" : ""} placed`}
        </Text>
      </View>
    </View>
  );
}

/** Map score 0-100 to a continuous color: red → orange → yellow → green */
function scoreToColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  // Hue: 0 (red) at score 0 → 120 (green) at score 100
  const hue = (s / 100) * 120;
  return `hsl(${hue}, 85%, 48%)`;
}

interface Segment {
  coords: { latitude: number; longitude: number }[];
  color: string;
}

const GRADIENT_STEPS = 8;

function buildScoreSegments(
  _points: LatLon[],
  scores: ScoreOut[]
): Segment[] {
  if (scores.length < 2) return [];

  const segments: Segment[] = [];
  for (let i = 0; i < scores.length - 1; i++) {
    const a = scores[i];
    const b = scores[i + 1];
    // Split each segment into sub-segments with interpolated colors
    for (let step = 0; step < GRADIENT_STEPS; step++) {
      const t0 = step / GRADIENT_STEPS;
      const t1 = (step + 1) / GRADIENT_STEPS;
      const tMid = (t0 + t1) / 2;
      const scoreMid = a.score_0_100 + (b.score_0_100 - a.score_0_100) * tMid;
      segments.push({
        coords: [
          {
            latitude: a.lat + (b.lat - a.lat) * t0,
            longitude: a.lon + (b.lon - a.lon) * t0,
          },
          {
            latitude: a.lat + (b.lat - a.lat) * t1,
            longitude: a.lon + (b.lon - a.lon) * t1,
          },
        ],
        color: scoreToColor(scoreMid),
      });
    }
  }
  return segments;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  controls: {
    position: "absolute",
    top: 12,
    right: 12,
    gap: 8,
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
  },
  hintText: { color: "#fff", fontSize: 13 },
  scoreDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
  },
  scoreDotText: { color: "#fff", fontSize: 8, fontWeight: "700" },
  scoreDotActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  scoreDotTextActive: { color: "#fff", fontSize: 12, fontWeight: "700" },
  reportDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  reportDotText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
