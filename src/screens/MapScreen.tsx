import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
} from "react-native";
import RouteMap from "../components/RouteMap";
import TimePicker from "../components/TimePicker";
import ScoreCard from "../components/ScoreCard";
import { scoreRoute } from "../api/client";
import { LatLon, ScoreOut, DEFAULT_BOAT } from "../types";
import { routeDistanceMiles } from "../utils/geo";

function showAlert(title: string, msg: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

function formatNow(offsetHours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + offsetHours, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:00`;
}

/** Parse "YYYY-MM-DD HH:MM" as local time and add hours, return same format. */
function addHours(timeStr: string, hours: number): string {
  const [datePart, timePart] = timeStr.split(" ");
  if (!datePart || !timePart) return timeStr;
  const [y, mo, da] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  const d = new Date(y, mo - 1, da, h, mi);
  d.setTime(d.getTime() + hours * 3600_000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export default function MapScreen() {
  const [points, setPoints] = useState<LatLon[]>([]);
  const [startTime, setStartTime] = useState(formatNow(1));
  const [speedMph, setSpeedMph] = useState(30);
  const [scores, setScores] = useState<ScoreOut[]>([]);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTimes, setShowTimes] = useState(false);

  const distMiles = useMemo(() => routeDistanceMiles(points), [points]);

  const handleAddPoint = useCallback((p: LatLon) => {
    setPoints((prev) => [...prev, p]);
    setScores([]);
    setSelectedScore(null);
  }, []);

  const handleUndo = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
    setScores([]);
    setSelectedScore(null);
  }, []);

  const handleClear = useCallback(() => {
    setPoints([]);
    setScores([]);
    setSelectedScore(null);
  }, []);

  const handleScore = useCallback(async () => {
    if (points.length < 2) {
      showAlert("Need at least 2 points", "Tap the map to add route points.");
      return;
    }
    if (!startTime) {
      showAlert("Set departure", "Enter a departure time for the trip.");
      return;
    }
    if (speedMph <= 0) {
      showAlert("Set speed", "Enter a speed greater than 0.");
      return;
    }

    const dist = routeDistanceMiles(points);
    const durationHours = dist / speedMph;
    const durationMinutes = durationHours * 60;
    const endTime = addHours(startTime, durationHours);

    // ~1 sample per route segment, clamped to [1, 60] minutes
    const segments = points.length - 1;
    const sampleMinutes = Math.max(
      1,
      Math.min(60, Math.floor(durationMinutes / segments))
    );

    console.log("[ScoreRoute]", {
      distMiles: dist.toFixed(2),
      durationMin: durationMinutes.toFixed(1),
      startTime,
      endTime,
      sampleMinutes,
      segments,
      expectedSamples: Math.floor(durationMinutes / sampleMinutes) + 1,
    });

    setLoading(true);
    setScores([]);
    setSelectedScore(null);

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await scoreRoute({
        route: points.map((p) => ({ lat: p.lat, lon: p.lon })),
        start_time: startTime,
        end_time: endTime,
        timezone: tz,
        sample_every_minutes: sampleMinutes,
        boat: DEFAULT_BOAT,
        provider: "nws+ndbc+fetch+coops",
      });
      console.log("[ScoreRoute] response:", {
        numScores: res.scores.length,
        firstTime: res.scores[0]?.t_local,
        lastTime: res.scores[res.scores.length - 1]?.t_local,
      });
      setScores(res.scores);
      if (res.scores.length > 0) setSelectedScore(0);
    } catch (e: any) {
      showAlert("Scoring failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [points, startTime, speedMph]);

  const canScore = points.length >= 2 && !!startTime && speedMph > 0 && !loading;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Boat Ride</Text>
        <TouchableOpacity
          style={styles.timeToggle}
          onPress={() => setShowTimes((v) => !v)}
        >
          <Text style={styles.timeToggleText}>
            {showTimes ? "Hide Times" : "Times"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time picker (collapsible) */}
      {showTimes && (
        <TimePicker
          startTime={startTime}
          onStartChange={setStartTime}
          speedMph={speedMph}
          onSpeedChange={setSpeedMph}
          routeDistanceMiles={distMiles}
        />
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <RouteMap
          points={points}
          scores={scores}
          onAddPoint={handleAddPoint}
          onClearRoute={handleClear}
          onUndoPoint={handleUndo}
        />
      </View>

      {/* Score button */}
      {scores.length === 0 && (
        <View style={styles.scoreBar}>
          <TouchableOpacity
            style={[styles.scoreBtn, !canScore && styles.scoreBtnDisabled]}
            onPress={handleScore}
            disabled={!canScore}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.scoreBtnText}>
                Score Route ({points.length} pts)
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      <ScoreCard
        scores={scores}
        selectedIndex={selectedScore}
        onSelect={setSelectedScore}
        onDismiss={() => {
          setScores([]);
          setSelectedScore(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f0f23" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1a1a2e",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  timeToggle: {
    backgroundColor: "#16213e",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timeToggleText: { color: "#7ec8e3", fontSize: 13 },
  mapContainer: { flex: 1 },
  scoreBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1a1a2e",
  },
  scoreBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  scoreBtnDisabled: { backgroundColor: "#333", opacity: 0.6 },
  scoreBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
