import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import RouteMap from "../components/RouteMap";
import TimePicker from "../components/TimePicker";
import ScoreCard from "../components/ScoreCard";
import FeedbackPrompt from "../components/FeedbackPrompt";
import { scoreRoute, createRoute, createReport, getNearbyReports, getBoats, getBoatPresets, getProfile } from "../api/client";
import { LatLon, ScoreOut, Report, ReportType, CreateReportRequest, Boat, BoatProfile, WaterType } from "../types";
import { boatToProfile } from "../utils/boat";
import { boatTypeLabel } from "../components/BoatTypePicker";
import { HomeStackParamList } from "../types/navigation";
import { routeDistanceMiles } from "../utils/geo";
// Graceful import — expo-location may not be available in all dev builds
let Location: typeof import("expo-location") | null = null;
try {
  Location = require("expo-location");
} catch {
  // Native module not available (e.g. dev client built without it)
}

type Props = NativeStackScreenProps<HomeStackParamList, "Map">;

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

function regionFromPoints(pts: LatLon[]): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} | null {
  if (pts.length === 0) return null;
  let minLat = pts[0].lat, maxLat = pts[0].lat;
  let minLon = pts[0].lon, maxLon = pts[0].lon;
  for (const p of pts) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  const latDelta = Math.max(0.01, (maxLat - minLat) * 1.4);
  const lonDelta = Math.max(0.01, (maxLon - minLon) * 1.4);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "ride_quality", label: "Ride Quality" },
  { value: "hazard", label: "Hazard" },
  { value: "traffic", label: "Traffic" },
  { value: "sandbar", label: "Sandbar" },
  { value: "fuel", label: "Fuel" },
  { value: "weather", label: "Weather" },
];

export default function MapScreen({ route }: Props) {
  const { boat: initialBoat, loadRoute } = route.params;
  const insets = useSafeAreaInsets();
  const [currentBoat, setCurrentBoat] = useState<BoatProfile>(initialBoat);
  const [points, setPoints] = useState<LatLon[]>(loadRoute ?? []);
  const [startTime, setStartTime] = useState(formatNow(1));
  const [speedMph, setSpeedMph] = useState(30);
  const [scores, setScores] = useState<ScoreOut[]>([]);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTimes, setShowTimes] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Water type
  const [waterType, setWaterType] = useState<WaterType>("auto");
  const [waterTypeDetected, setWaterTypeDetected] = useState<"lake" | "tidal" | null>(null);

  // Save route modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [routeDesc, setRouteDesc] = useState("");
  const [savingRoute, setSavingRoute] = useState(false);

  // Reports
  const [reports, setReports] = useState<Report[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("ride_quality");
  const [creatingReport, setCreatingReport] = useState(false);

  // Boat picker modal
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [boatList, setBoatList] = useState<Boat[]>([]);
  const [boatPresets, setBoatPresets] = useState<Boat[]>([]);
  const [boatsLoading, setBoatsLoading] = useState(false);

  // Location
  const [userLocation, setUserLocation] = useState<LatLon | null>(null);
  const [locationRegion, setLocationRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [homeRegion, setHomeRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  // Compute initial region: prefer loaded route bounds, then GPS, then home region
  const routeRegion = useMemo(() => loadRoute ? regionFromPoints(loadRoute) : null, [loadRoute]);

  // Load user's home region on mount
  useEffect(() => {
    getProfile()
      .then((p) => {
        if (p.home_lat != null && p.home_lon != null) {
          setHomeRegion({
            latitude: p.home_lat,
            longitude: p.home_lon,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          });
        }
      })
      .catch(() => {}); // silently fail if not logged in
  }, []);

  // Request location on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") {
        // Use browser geolocation on web
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
              setUserLocation(loc);
              setLocationRegion({
                latitude: loc.lat,
                longitude: loc.lon,
                latitudeDelta: 0.15,
                longitudeDelta: 0.15,
              });
            },
            () => {} // silently fail
          );
        }
      } else if (Location) {
        // Native: use expo-location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        setLocationRegion({
          latitude: loc.lat,
          longitude: loc.lon,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        });
      }
    })();
  }, []);

  const distMiles = useMemo(() => routeDistanceMiles(points), [points]);

  // Load nearby reports when points change or location becomes available
  useEffect(() => {
    let center: LatLon | null = null;
    if (points.length > 0) {
      center = points[Math.floor(points.length / 2)];
    } else if (userLocation) {
      center = userLocation;
    }
    if (!center) return;
    getNearbyReports(center.lat, center.lon, 20).then(setReports).catch(() => {});
  }, [points.length, userLocation]);

  const handleAddPoint = useCallback((p: LatLon) => {
    setPoints((prev) => [...prev, p]);
    setScores([]);
    setSelectedScore(null);
    setShowFeedback(false);
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
    setShowFeedback(false);
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

    const segments = points.length - 1;
    const sampleMinutes = Math.max(
      1,
      Math.min(60, Math.floor(durationMinutes / segments))
    );

    setLoading(true);
    setScores([]);
    setSelectedScore(null);
    setShowFeedback(false);

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await scoreRoute({
        route: points.map((p) => ({ lat: p.lat, lon: p.lon })),
        start_time: startTime,
        end_time: endTime,
        timezone: tz,
        sample_every_minutes: sampleMinutes,
        boat: currentBoat,
        provider: "nws+ndbc+fetch+coops",
        water_type: waterType,
      });
      setScores(res.scores);
      setWaterTypeDetected(res.water_type_used ?? null);
      if (res.scores.length > 0) setSelectedScore(0);
    } catch (e: any) {
      showAlert("Scoring failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [points, startTime, speedMph, currentBoat, waterType]);

  const handleSaveRoute = async () => {
    if (!routeName.trim() || points.length < 2) return;
    setSavingRoute(true);
    try {
      await createRoute({
        name: routeName.trim(),
        description: routeDesc.trim() || undefined,
        route_points: points,
      });
      setShowSaveModal(false);
      setRouteName("");
      setRouteDesc("");
      showAlert("Saved", "Route saved successfully!");
    } catch (e: any) {
      showAlert("Save failed", e.message ?? "Unknown error");
    } finally {
      setSavingRoute(false);
    }
  };

  const handleCreateReport = async () => {
    setCreatingReport(true);
    try {
      // Try to get a fresh GPS position first
      let loc: LatLon | null = null;
      if (Platform.OS === "web") {
        loc = await new Promise<LatLon | null>((resolve) => {
          if (typeof navigator !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
              () => resolve(null),
              { timeout: 5000 }
            );
          } else {
            resolve(null);
          }
        });
      } else if (Location) {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          }
        } catch {}
      }

      // Fall back to cached location, then route midpoint
      if (!loc) loc = userLocation;
      if (!loc && points.length > 0) {
        loc = points[Math.floor(points.length / 2)];
      }
      if (!loc) {
        showAlert("No location", "Unable to determine your location. Draw a route or enable location services.");
        return;
      }

      const data: CreateReportRequest = {
        report_type: reportType,
        lat: loc.lat,
        lon: loc.lon,
      };
      await createReport(data);
      setShowReportModal(false);
      // Refresh reports
      const updated = await getNearbyReports(loc.lat, loc.lon, 20);
      setReports(updated);
      showAlert("Report Created", "Thanks for the report!");
    } catch (e: any) {
      showAlert("Report failed", e.message ?? "Unknown error");
    } finally {
      setCreatingReport(false);
    }
  };

  const handleOpenBoatPicker = useCallback(async () => {
    setShowBoatModal(true);
    setBoatsLoading(true);
    const [mineResult, presetResult] = await Promise.allSettled([
      getBoats(),
      getBoatPresets(),
    ]);
    if (mineResult.status === "fulfilled") setBoatList(mineResult.value.filter((b) => !b.is_preset));
    if (presetResult.status === "fulfilled") setBoatPresets(presetResult.value);
    setBoatsLoading(false);
  }, []);

  const handlePickBoat = useCallback((boat: Boat) => {
    setCurrentBoat(boatToProfile(boat));
    setShowBoatModal(false);
  }, []);

  const canScore = points.length >= 2 && !!startTime && speedMph > 0 && !loading;

  // For feedback: use the average score location
  const avgScore =
    scores.length > 0
      ? scores.reduce((s, sc) => s + sc.score_0_100, 0) / scores.length
      : 0;
  const midScore = scores.length > 0 ? scores[Math.floor(scores.length / 2)] : null;

  return (
    <View style={styles.root}>
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
          reports={reports}
          initialRegion={routeRegion ?? homeRegion ?? locationRegion ?? undefined}
          showsUserLocation={true}
          highlightedScoreIndex={selectedScore}
        />
      </View>

      {/* Score bar with times toggle */}
      {scores.length === 0 && !showFeedback && (
        <View style={[styles.scoreBar, { paddingBottom: 10 + insets.bottom }]}>
          {/* Boat selector row */}
          <TouchableOpacity
            style={styles.boatChip}
            onPress={handleOpenBoatPicker}
          >
            <Text style={styles.boatChipLabel}>Boat:</Text>
            <Text style={styles.boatChipName} numberOfLines={1}>
              {currentBoat.name}
            </Text>
            <Text style={styles.boatChipArrow}>Change</Text>
          </TouchableOpacity>

          {/* Water type toggle */}
          <View style={styles.waterTypeRow}>
            {(["auto", "lake", "tidal"] as const).map((wt) => {
              const active = waterType === wt;
              let label = wt.charAt(0).toUpperCase() + wt.slice(1);
              if (wt === "auto" && waterTypeDetected) {
                label = `Auto (${waterTypeDetected})`;
              }
              return (
                <TouchableOpacity
                  key={wt}
                  style={[styles.waterTypeChip, active && styles.waterTypeChipActive]}
                  onPress={() => { setWaterType(wt); setWaterTypeDetected(null); }}
                >
                  <Text style={[styles.waterTypeText, active && styles.waterTypeTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.scoreBarRow}>
            <TouchableOpacity
              style={styles.timeToggle}
              onPress={() => setShowTimes((v) => !v)}
            >
              <Text style={styles.timeToggleText}>
                {showTimes ? "Hide Times" : "Times"}
              </Text>
            </TouchableOpacity>
            {points.length >= 2 && (
              <TouchableOpacity
                style={styles.saveRouteBtn}
                onPress={() => setShowSaveModal(true)}
              >
                <Text style={styles.saveRouteBtnText}>Save</Text>
              </TouchableOpacity>
            )}
            {(points.length > 0 || userLocation) && (
              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() => setShowReportModal(true)}
              >
                <Text style={styles.reportBtnText}>Report</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.scoreBtn, !canScore && styles.scoreBtnDisabled]}
              onPress={handleScore}
              disabled={!canScore}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.scoreBtnText}>
                  Score ({points.length} pts)
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Results */}
      {!showFeedback && (
        <ScoreCard
          scores={scores}
          selectedIndex={selectedScore}
          onSelect={setSelectedScore}
          onDismiss={() => {
            setShowFeedback(true);
          }}
        />
      )}

      {/* Feedback prompt after scoring */}
      {showFeedback && midScore && (
        <FeedbackPrompt
          lat={midScore.lat}
          lon={midScore.lon}
          originalScore={avgScore}
          conditionsSnapshot={midScore.detail as Record<string, unknown>}
          onDismiss={() => {
            setShowFeedback(false);
            setScores([]);
            setSelectedScore(null);
          }}
        />
      )}

      {/* Save Route Modal */}
      <Modal visible={showSaveModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Save Route</Text>
            <TextInput
              style={styles.modalInput}
              value={routeName}
              onChangeText={setRouteName}
              placeholder="Route name"
              placeholderTextColor="#484f58"
            />
            <TextInput
              style={[styles.modalInput, { minHeight: 60 }]}
              value={routeDesc}
              onChangeText={setRouteDesc}
              placeholder="Description (optional)"
              placeholderTextColor="#484f58"
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSave,
                  (!routeName.trim() || savingRoute) && styles.modalSaveDisabled,
                ]}
                onPress={handleSaveRoute}
                disabled={!routeName.trim() || savingRoute}
              >
                {savingRoute ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Create Report</Text>
            <View style={styles.reportTypes}>
              {REPORT_TYPES.map((rt) => (
                <TouchableOpacity
                  key={rt.value}
                  style={[
                    styles.reportTypeBtn,
                    reportType === rt.value && styles.reportTypeBtnActive,
                  ]}
                  onPress={() => setReportType(rt.value)}
                >
                  <Text
                    style={[
                      styles.reportTypeText,
                      reportType === rt.value && styles.reportTypeTextActive,
                    ]}
                  >
                    {rt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSave,
                  creatingReport && styles.modalSaveDisabled,
                ]}
                onPress={handleCreateReport}
                disabled={creatingReport}
              >
                {creatingReport ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Boat Picker Modal */}
      <Modal visible={showBoatModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Choose Boat</Text>
            {boatsLoading ? (
              <ActivityIndicator color="#58a6ff" size="large" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {boatList.length > 0 && (
                  <>
                    <Text style={styles.boatSectionTitle}>My Boats</Text>
                    {boatList.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.boatPickerCard,
                          currentBoat.name === b.name && styles.boatPickerCardActive,
                        ]}
                        onPress={() => handlePickBoat(b)}
                      >
                        <Text style={styles.boatPickerName}>{b.name}</Text>
                        <Text style={styles.boatPickerDetail}>
                          {boatTypeLabel(b.boat_type)} | {b.length_ft}ft | Wind {b.max_safe_wind_kt}kt | Wave {b.max_safe_wave_ft}ft
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {boatPresets.length > 0 && (
                  <>
                    <Text style={[styles.boatSectionTitle, boatList.length > 0 && { marginTop: 16 }]}>
                      Popular Models
                    </Text>
                    {boatPresets.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.boatPickerCard,
                          currentBoat.name === b.name && styles.boatPickerCardActive,
                        ]}
                        onPress={() => handlePickBoat(b)}
                      >
                        <Text style={styles.boatPickerName}>
                          {b.make && b.model ? `${b.make} ${b.model}` : b.name}
                        </Text>
                        <Text style={styles.boatPickerDetail}>
                          {boatTypeLabel(b.boat_type)} | {b.length_ft}ft | Wind {b.max_safe_wind_kt}kt | Wave {b.max_safe_wave_ft}ft
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.modalCancel, { marginTop: 12 }]}
              onPress={() => setShowBoatModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1117" },
  mapContainer: { flex: 1 },
  scoreBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#161b22",
  },
  scoreBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeToggle: {
    backgroundColor: "#21262d",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  timeToggleText: { color: "#58a6ff", fontSize: 13, fontWeight: "600" },
  saveRouteBtn: {
    backgroundColor: "#21262d",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveRouteBtnText: { color: "#3fb950", fontSize: 13, fontWeight: "600" },
  reportBtn: {
    backgroundColor: "#21262d",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  reportBtnText: { color: "#d29922", fontSize: 13, fontWeight: "600" },
  scoreBtn: {
    flex: 1,
    backgroundColor: "#1f6feb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  scoreBtnDisabled: { backgroundColor: "#21262d", opacity: 0.6 },
  scoreBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#161b22",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "#0d1117",
    color: "#f0f6fc",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#30363d",
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#21262d",
  },
  modalCancelText: { color: "#58a6ff", fontSize: 15, fontWeight: "600" },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#238636",
  },
  modalSaveDisabled: { opacity: 0.5 },
  modalSaveText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // Report types
  reportTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  reportTypeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  reportTypeBtnActive: {
    backgroundColor: "#1f6feb",
    borderColor: "#58a6ff",
  },
  reportTypeText: { color: "#8b949e", fontSize: 14 },
  reportTypeTextActive: { color: "#fff", fontWeight: "600" },

  // Water type chips
  waterTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  waterTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  waterTypeChipActive: {
    backgroundColor: "#1f6feb",
    borderColor: "#58a6ff",
  },
  waterTypeText: { color: "#8b949e", fontSize: 13 },
  waterTypeTextActive: { color: "#fff", fontWeight: "600" },

  // Boat chip
  boatChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#21262d",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  boatChipLabel: { color: "#8b949e", fontSize: 13, marginRight: 6 },
  boatChipName: { color: "#f0f6fc", fontSize: 14, fontWeight: "600", flex: 1 },
  boatChipArrow: { color: "#58a6ff", fontSize: 12, fontWeight: "600" },

  // Boat picker modal
  boatSectionTitle: {
    color: "#8b949e",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  boatPickerCard: {
    backgroundColor: "#0d1117",
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#30363d",
    borderLeftWidth: 3,
    borderLeftColor: "#30363d",
  },
  boatPickerCardActive: {
    borderLeftColor: "#58a6ff",
    borderColor: "#58a6ff",
  },
  boatPickerName: { color: "#f0f6fc", fontSize: 14, fontWeight: "600" },
  boatPickerDetail: { color: "#8b949e", fontSize: 12, marginTop: 2 },
});
