import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";

// Native-only map imports
let MapView: any = null;
let MapMarker: any = null;
if (Platform.OS !== "web") {
  try {
    const RNMaps = require("react-native-maps");
    MapView = RNMaps.default;
    MapMarker = RNMaps.Marker;
  } catch {}
}

interface Props {
  visible: boolean;
  currentLat: number | null;
  currentLon: number | null;
  onConfirm: (lat: number, lon: number, displayName: string) => void;
  onCancel: () => void;
}

const DEFAULT_CENTER = { latitude: 32.08, longitude: -81.09 }; // Savannah, GA
const DEFAULT_DELTA = { latitudeDelta: 0.5, longitudeDelta: 0.5 };

/** Forward geocode: place name → coordinates */
async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "User-Agent": "SmoothSailor-App/1.0" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

/** Reverse geocode: coordinates → place name */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { headers: { "User-Agent": "SmoothSailor-App/1.0" } }
    );
    const data = await res.json();
    if (data.address) {
      const a = data.address;
      const city = a.city || a.town || a.village || a.county || "";
      const state = a.state || "";
      if (city && state) return `${city}, ${state}`;
      if (city) return city;
      if (state) return state;
      return data.display_name?.split(",").slice(0, 2).join(",").trim() ?? "";
    }
  } catch {}
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

export default function HomeLocationPicker({
  visible,
  currentLat,
  currentLon,
  onConfirm,
  onCancel,
}: Props) {
  const mapRef = useRef<any>(null);
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      if (currentLat != null && currentLon != null) {
        setPin({ lat: currentLat, lon: currentLon });
        setPlaceName("Loading...");
        reverseGeocode(currentLat, currentLon).then(setPlaceName);
      } else {
        setPin(null);
        setPlaceName("");
      }
      setSearch("");
    }
  }, [visible]);

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ lat: latitude, lon: longitude });
    setPlaceName("Looking up...");
    setResolving(true);
    reverseGeocode(latitude, longitude).then((name) => {
      setPlaceName(name);
      setResolving(false);
    });
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    Keyboard.dismiss();
    setSearching(true);
    const result = await geocode(search.trim());
    setSearching(false);
    if (result) {
      setPin(result);
      setPlaceName("Looking up...");
      setResolving(true);
      reverseGeocode(result.lat, result.lon).then((name) => {
        setPlaceName(name);
        setResolving(false);
      });
      // Animate map to the location
      mapRef.current?.animateToRegion(
        {
          latitude: result.lat,
          longitude: result.lon,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        },
        500
      );
    } else {
      setPlaceName("Location not found — try a different search");
    }
  };

  const handleConfirm = () => {
    if (pin && placeName && !resolving) {
      onConfirm(pin.lat, pin.lon, placeName);
    }
  };

  const initialRegion = {
    latitude: currentLat ?? DEFAULT_CENTER.latitude,
    longitude: currentLon ?? DEFAULT_CENTER.longitude,
    ...DEFAULT_DELTA,
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <View style={styles.sheet}>
          <Text style={styles.title}>Set Home Location</Text>
          <Text style={styles.subtitle}>
            Search for a city or tap the map to place your pin
          </Text>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search city or address..."
              placeholderTextColor="#484f58"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.searchBtnText}>Go</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Map */}
          {MapView ? (
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion}
                onPress={handleMapPress}
                mapType="hybrid"
                toolbarEnabled={false}
              >
                {pin && MapMarker && (
                  <MapMarker
                    coordinate={{ latitude: pin.lat, longitude: pin.lon }}
                    pinColor="#58a6ff"
                  />
                )}
              </MapView>
            </View>
          ) : (
            <View style={styles.webFallback}>
              <Text style={styles.webFallbackText}>
                Type a city above and tap "Go" to set your location
              </Text>
            </View>
          )}

          {/* Selected location display */}
          {pin && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationName} numberOfLines={1}>
                {placeName}
              </Text>
              <Text style={styles.locationCoords}>
                {pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!pin || resolving) && styles.confirmDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!pin || resolving}
            >
              <Text style={styles.confirmText}>Set Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#161b22",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  title: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: "#8b949e",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#0d1117",
    color: "#f0f6fc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  searchBtn: {
    backgroundColor: "#1f6feb",
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  mapContainer: {
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  map: { flex: 1 },
  webFallback: {
    height: 120,
    borderRadius: 12,
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#30363d",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  webFallbackText: {
    color: "#8b949e",
    fontSize: 14,
    textAlign: "center",
  },
  locationInfo: {
    backgroundColor: "#0d1117",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#30363d",
    borderLeftWidth: 3,
    borderLeftColor: "#58a6ff",
  },
  locationName: {
    color: "#f0f6fc",
    fontSize: 15,
    fontWeight: "600",
  },
  locationCoords: {
    color: "#8b949e",
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#21262d",
  },
  cancelText: { color: "#58a6ff", fontSize: 16, fontWeight: "600" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#238636",
  },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
