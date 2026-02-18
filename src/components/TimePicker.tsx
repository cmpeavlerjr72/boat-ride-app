import React, { useState, useMemo } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from "react-native";
import DateTimePickerModal from "./DateTimePickerModal";

interface Props {
  startTime: string;
  onStartChange: (v: string) => void;
  speedMph: number;
  onSpeedChange: (v: number) => void;
  routeDistanceMiles: number;
}

/** Parse "YYYY-MM-DD HH:MM" into a Date */
function parseTimeStr(s: string): Date {
  const [datePart, timePart] = s.split(" ");
  if (!datePart || !timePart) return new Date();
  const [y, mo, da] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  return new Date(y, mo - 1, da, h, mi);
}

/** Format a Date back to "YYYY-MM-DD HH:MM" */
function fmtDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

/** Human-readable display like "Wed Feb 18, 3:00 PM" */
function displayDate(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = days[d.getDay()];
  const mon = months[d.getMonth()];
  const date = d.getDate();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  return `${day} ${mon} ${date}, ${hours}:${mins} ${ampm}`;
}

function formatToday(hoursFromNow: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow, 0, 0, 0);
  return fmtDate(d);
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
  const [showPicker, setShowPicker] = useState(false);
  const durationHours = speedMph > 0 ? distance / speedMph : 0;
  const dateObj = useMemo(() => parseTimeStr(startTime), [startTime]);

  return (
    <View style={styles.container}>
      {/* Departure + Speed row */}
      <View style={styles.row}>
        <View style={styles.fieldWide}>
          <Text style={styles.label}>Departure</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.dateBtnText}>{displayDate(dateObj)}</Text>
          </TouchableOpacity>
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
            placeholderTextColor="#484f58"
          />
        </View>
      </View>

      {/* Quick buttons */}
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
            onStartChange(fmtDate(d));
          }}
        >
          <Text style={styles.quickBtnText}>Tomorrow AM</Text>
        </TouchableOpacity>
      </View>

      {/* Trip info */}
      {distance > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>{distance.toFixed(1)} mi</Text>
          <Text style={styles.infoSep}>|</Text>
          <Text style={styles.infoText}>~{formatDuration(durationHours)}</Text>
        </View>
      )}

      {/* Date/time picker modal */}
      <DateTimePickerModal
        visible={showPicker}
        value={dateObj}
        onConfirm={(d) => {
          onStartChange(fmtDate(d));
          setShowPicker(false);
        }}
        onCancel={() => setShowPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#161b22",
  },
  row: { flexDirection: "row", gap: 8 },
  fieldWide: { flex: 2 },
  fieldNarrow: { flex: 1 },
  label: { color: "#8b949e", fontSize: 11, marginBottom: 2 },
  dateBtn: {
    backgroundColor: "#0d1117",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  dateBtnText: {
    color: "#58a6ff",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#0d1117",
    color: "#f0f6fc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  quickLabel: { color: "#8b949e", fontSize: 12 },
  quickBtn: {
    backgroundColor: "#21262d",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  quickBtnText: { color: "#58a6ff", fontSize: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  infoText: { color: "#58a6ff", fontSize: 13 },
  infoSep: { color: "#484f58", fontSize: 13 },
});
