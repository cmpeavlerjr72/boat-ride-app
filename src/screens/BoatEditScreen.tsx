import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BoatsStackParamList } from "../types/navigation";
import { BoatType } from "../types";
import { createBoat, updateBoat, deleteBoat } from "../api/client";
import BoatTypePicker, { boatTypeLabel } from "../components/BoatTypePicker";

type Props = NativeStackScreenProps<BoatsStackParamList, "BoatEdit">;

function showConfirm(title: string, msg: string, onOk: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${msg}`)) onOk();
  } else {
    Alert.alert(title, msg, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onOk },
    ]);
  }
}

export default function BoatEditScreen({ route, navigation }: Props) {
  const existing = route.params?.boat;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [boatType, setBoatType] = useState<BoatType>(
    existing?.boat_type ?? "center_console"
  );
  const [lengthFt, setLengthFt] = useState(
    existing ? String(existing.length_ft) : "22"
  );
  const [beamFt, setBeamFt] = useState(
    existing ? String(existing.beam_ft) : "8.5"
  );
  const [draftFt, setDraftFt] = useState(
    existing ? String(existing.draft_ft) : "1.5"
  );
  const [weightLbs, setWeightLbs] = useState(
    existing?.weight_lbs ? String(existing.weight_lbs) : ""
  );
  const [hullType, setHullType] = useState(existing?.hull_type ?? "");
  const [maxWind, setMaxWind] = useState(
    existing ? String(existing.max_safe_wind_kt) : "25"
  );
  const [maxWave, setMaxWave] = useState(
    existing ? String(existing.max_safe_wave_ft) : "4"
  );
  const [comfortBias, setComfortBias] = useState(
    existing ? String(existing.comfort_bias) : "0"
  );
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        boat_type: boatType,
        length_ft: parseFloat(lengthFt) || 22,
        beam_ft: parseFloat(beamFt) || 8.5,
        draft_ft: parseFloat(draftFt) || 1.5,
        weight_lbs: weightLbs ? parseFloat(weightLbs) : undefined,
        hull_type: hullType.trim() || undefined,
        max_safe_wind_kt: parseFloat(maxWind) || 25,
        max_safe_wave_ft: parseFloat(maxWave) || 4,
        comfort_bias: parseFloat(comfortBias) || 0,
      };
      if (isEdit) {
        await updateBoat(existing.id, data);
      } else {
        await createBoat(data);
      }
      navigation.goBack();
    } catch (e: any) {
      console.warn("Save failed:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    showConfirm("Delete Boat", `Delete "${existing.name}"?`, async () => {
      try {
        await deleteBoat(existing.id);
        navigation.goBack();
      } catch (e: any) {
        console.warn("Delete failed:", e.message);
      }
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Field label="Boat Name" value={name} onChangeText={setName} />

        <View style={styles.field}>
          <Text style={styles.label}>Boat Type</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowTypePicker(true)}
          >
            <Text style={styles.pickerText}>{boatTypeLabel(boatType)}</Text>
          </TouchableOpacity>
        </View>

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
          label="Weight (lbs)"
          value={weightLbs}
          onChangeText={setWeightLbs}
          numeric
        />
        <Field label="Hull Type" value={hullType} onChangeText={setHullType} />
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
        <Field
          label="Comfort Bias (-1 to 1)"
          value={comfortBias}
          onChangeText={setComfortBias}
          numeric
        />

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEdit ? "Update Boat" : "Create Boat"}
            </Text>
          )}
        </TouchableOpacity>

        {isEdit && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete Boat</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <BoatTypePicker
        visible={showTypePicker}
        selected={boatType}
        onSelect={setBoatType}
        onClose={() => setShowTypePicker(false)}
      />
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
  field: { marginBottom: 18 },
  label: {
    color: "#c9d1d9",
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "600",
  },
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
  pickerBtn: {
    backgroundColor: "#0d1117",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  pickerText: { color: "#f0f6fc", fontSize: 16 },
  saveBtn: {
    backgroundColor: "#238636",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  deleteBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(248,81,73,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,81,73,0.4)",
  },
  deleteBtnText: { color: "#f85149", fontSize: 16, fontWeight: "600" },
});
