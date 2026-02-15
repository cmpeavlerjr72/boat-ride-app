import React from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from "react-native";

interface Props {
  startTime: string;
  onStartChange: (v: string) => void;
  speedMph: number;
  onSpeedChange: (v: number) => void;
  routeDistanceMiles: number;
}

function formatToday(hoursFromNow: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:00`;
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TimePicker({
  startTime,
  onStartChange,
  speedMph,
  onSpeedChange,
  routeDistanceMiles: distance,
}: Props) {
  const durationHours = speedMph > 0 ? distance / speedMph : 0;

  return (
    <View style={styles.container}>
      {/* Start time + Speed */}
      <View style={styles.row}>
        <View style={styles.fieldWide}>
          <Text style={styles.label}>Departure</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={onStartChange}
            placeholder="2026-01-22 08:00"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.fieldNarrow}>
          <Text style={styles.label}>Speed (MPH)</Text>
          <TextInput
            style={styles.input}
            value={String(speedMph)}
            onChangeText={(t) => {
              const n = parseFloat(t);
              if (!isNaN(n) && n >= 0) onSpeedChange(n);
              else if (t === "") onSpeedChange(0);
            }}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Quick start buttons */}
      <View style={styles.quickRow}>
        <Text style={styles.quickLabel}>Quick:</Text>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => onStartChange(formatToday(0))}
        >
          <Text style={styles.quickBtnText}>Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => onStartChange(formatToday(1))}
        >
          <Text style={styles.quickBtnText}>+1h</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            d.setHours(7, 0, 0, 0);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            onStartChange(`${yyyy}-${mm}-${dd} 07:00`);
          }}
        >
          <Text style={styles.quickBtnText}>Tomorrow AM</Text>
        </TouchableOpacity>
      </View>

      {/* Trip info */}
      {distance > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            {distance.toFixed(1)} mi
          </Text>
          <Text style={styles.infoSep}>|</Text>
          <Text style={styles.infoText}>
            ~{formatDuration(durationHours)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1a1a2e",
  },
  row: { flexDirection: "row", gap: 8 },
  fieldWide: { flex: 2 },
  fieldNarrow: { flex: 1 },
  label: { color: "#aaa", fontSize: 11, marginBottom: 2 },
  input: {
    backgroundColor: "#16213e",
    color: "#fff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  quickLabel: { color: "#888", fontSize: 12 },
  quickBtn: {
    backgroundColor: "#16213e",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  quickBtnText: { color: "#7ec8e3", fontSize: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  infoText: { color: "#7ec8e3", fontSize: 13 },
  infoSep: { color: "#555", fontSize: 13 },
});
