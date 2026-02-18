import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../types/navigation";
import { Boat, DEFAULT_BOAT } from "../types";
import { getBoats, getBoatPresets } from "../api/client";
import { boatToProfile } from "../utils/boat";
import { boatTypeLabel } from "../components/BoatTypePicker";

type Props = NativeStackScreenProps<HomeStackParamList, "BoatSetup">;

export default function BoatSetupScreen({ navigation }: Props) {
  const [myBoats, setMyBoats] = useState<Boat[]>([]);
  const [presets, setPresets] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);

  // Manual form state
  const [name, setName] = useState(DEFAULT_BOAT.name);
  const [lengthFt, setLengthFt] = useState(String(DEFAULT_BOAT.length_ft));
  const [beamFt, setBeamFt] = useState(String(DEFAULT_BOAT.beam_ft));
  const [draftFt, setDraftFt] = useState(String(DEFAULT_BOAT.draft_ft));
  const [maxWind, setMaxWind] = useState(String(DEFAULT_BOAT.max_safe_wind_kt));
  const [maxWave, setMaxWave] = useState(String(DEFAULT_BOAT.max_safe_wave_ft));

  const loadBoats = useCallback(async () => {
    // Load independently so one failure doesn't block the other
    const [mineResult, presetResult] = await Promise.allSettled([
      getBoats(),
      getBoatPresets(),
    ]);
    if (mineResult.status === "fulfilled") setMyBoats(mineResult.value.filter((b) => !b.is_preset));
    if (presetResult.status === "fulfilled") setPresets(presetResult.value);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBoats();
    }, [loadBoats])
  );

  const handleSelectBoat = (boat: Boat) => {
    navigation.navigate("Map", { boat: boatToProfile(boat) });
  };

  const handleContinue = () => {
    navigation.navigate("Map", {
      boat: {
        name: name || DEFAULT_BOAT.name,
        length_ft: parseFloat(lengthFt) || DEFAULT_BOAT.length_ft,
        beam_ft: parseFloat(beamFt) || DEFAULT_BOAT.beam_ft,
        draft_ft: parseFloat(draftFt) || DEFAULT_BOAT.draft_ft,
        comfort_bias: DEFAULT_BOAT.comfort_bias,
        max_safe_wind_kt: parseFloat(maxWind) || DEFAULT_BOAT.max_safe_wind_kt,
        max_safe_wave_ft: parseFloat(maxWave) || DEFAULT_BOAT.max_safe_wave_ft,
      },
    });
  };

  const renderBoatCard = (boat: Boat) => (
    <TouchableOpacity
      key={boat.id}
      style={styles.boatCard}
      onPress={() => handleSelectBoat(boat)}
    >
      <Text style={styles.boatName}>{boat.name}</Text>
      <Text style={styles.boatDetail}>
        {boatTypeLabel(boat.boat_type)} | {boat.length_ft}ft |{" "}
        Wind {boat.max_safe_wind_kt}kt | Wave {boat.max_safe_wave_ft}ft
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#58a6ff" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* My Boats section */}
        {myBoats.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Boats</Text>
            {myBoats.map(renderBoatCard)}
          </>
        )}

        {/* Presets section */}
        {presets.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, myBoats.length > 0 && { marginTop: 24 }]}>
              Presets
            </Text>
            {presets.map(renderBoatCard)}
          </>
        )}

        {/* Manual configuration toggle */}
        <TouchableOpacity
          style={styles.manualToggle}
          onPress={() => setShowManual((v) => !v)}
        >
          <Text style={styles.manualToggleText}>
            {showManual ? "Hide manual configuration" : "Or configure manually..."}
          </Text>
        </TouchableOpacity>

        {/* Manual form */}
        {showManual && (
          <>
            <Field label="Boat Name" value={name} onChangeText={setName} />
            <Field
              label="Length (ft)"
              value={lengthFt}
              onChangeText={setLengthFt}
              numeric
            />
            <Field
              label="Beam (ft)"
              value={beamFt}
              onChangeText={setBeamFt}
              numeric
            />
            <Field
              label="Draft (ft)"
              value={draftFt}
              onChangeText={setDraftFt}
              numeric
            />
            <Field
              label="Max Safe Wind (kt)"
              value={maxWind}
              onChangeText={setMaxWind}
              numeric
            />
            <Field
              label="Max Safe Wave (ft)"
              value={maxWave}
              onChangeText={setMaxWave}
              numeric
            />

            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  numeric,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? "decimal-pad" : "default"}
        placeholderTextColor="#484f58"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1117" },
  scroll: { padding: 24, paddingBottom: 48 },
  center: {
    flex: 1,
    backgroundColor: "#0d1117",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  boatCard: {
    backgroundColor: "#161b22",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    borderLeftWidth: 3,
    borderLeftColor: "#58a6ff",
  },
  boatName: { color: "#f0f6fc", fontSize: 16, fontWeight: "600" },
  boatDetail: { color: "#8b949e", fontSize: 13, marginTop: 4 },
  manualToggle: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  manualToggleText: { color: "#58a6ff", fontSize: 15, fontWeight: "600" },
  field: { marginBottom: 18, marginTop: 4 },
  label: { color: "#c9d1d9", fontSize: 13, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "#0d1117",
    color: "#f0f6fc",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  continueBtn: {
    backgroundColor: "#238636",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
