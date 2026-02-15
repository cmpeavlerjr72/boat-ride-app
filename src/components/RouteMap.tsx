import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker, Polyline, MapPressEvent, Region } from "react-native-maps";
import { LatLon, ScoreOut, SCORE_COLORS } from "../types";

interface Props {
  points: LatLon[];
  scores: ScoreOut[];
  onAddPoint: (point: LatLon) => void;
  onClearRoute: () => void;
  onUndoPoint: () => void;
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
}: Props) {
  const handlePress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onAddPoint({ lat: latitude, lon: longitude });
  };

  // Build score-colored polyline segments
  const scoreSegments = buildScoreSegments(points, scores);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onPress={handlePress}
        mapType="hybrid"
      >
        {/* Route waypoint markers */}
        {points.map((p, i) => (
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

        {/* Score point markers */}
        {scores.map((s, i) => (
          <Marker
            key={`score-${i}`}
            coordinate={{ latitude: s.lat, longitude: s.lon }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.scoreDot,
                { backgroundColor: SCORE_COLORS[s.label] },
              ]}
            >
              <Text style={styles.scoreDotText}>
                {Math.round(s.score_0_100)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Map controls overlay */}
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
            ? "Tap the map to add route points"
            : `${points.length} point${points.length > 1 ? "s" : ""} placed`}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Segment {
  coords: { latitude: number; longitude: number }[];
  color: string;
}

function buildScoreSegments(
  points: LatLon[],
  scores: ScoreOut[]
): Segment[] {
  if (scores.length < 2) return [];

  const segments: Segment[] = [];
  for (let i = 0; i < scores.length - 1; i++) {
    const a = scores[i];
    const b = scores[i + 1];
    segments.push({
      coords: [
        { latitude: a.lat, longitude: a.lon },
        { latitude: b.lat, longitude: b.lon },
      ],
      color: SCORE_COLORS[a.label],
    });
  }
  return segments;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  controls: {
    position: "absolute",
    top: 60,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  scoreDotText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
