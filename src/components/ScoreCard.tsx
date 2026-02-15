import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ScoreOut, SCORE_COLORS } from "../types";

interface Props {
  scores: ScoreOut[];
  selectedIndex: number | null;
  onSelect: (i: number) => void;
  onDismiss: () => void;
}

export default function ScoreCard({
  scores,
  selectedIndex,
  onSelect,
  onDismiss,
}: Props) {
  if (scores.length === 0) return null;

  const selected = selectedIndex !== null ? scores[selectedIndex] : null;

  // Summary stats
  const avg =
    scores.reduce((s, sc) => s + sc.score_0_100, 0) / scores.length;
  const worst = Math.min(...scores.map((s) => s.score_0_100));
  const best = Math.max(...scores.map((s) => s.score_0_100));

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Avg</Text>
          <Text style={styles.summaryValue}>{avg.toFixed(0)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Best</Text>
          <Text style={[styles.summaryValue, { color: "#22c55e" }]}>
            {best.toFixed(0)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Worst</Text>
          <Text style={[styles.summaryValue, { color: "#ef4444" }]}>
            {worst.toFixed(0)}
          </Text>
        </View>
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissText}>X</Text>
        </TouchableOpacity>
      </View>

      {/* Timeline scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.timeline}>
          {scores.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.timeChip,
                {
                  backgroundColor: SCORE_COLORS[s.label],
                  borderColor: i === selectedIndex ? "#fff" : "transparent",
                },
              ]}
              onPress={() => onSelect(i)}
            >
              <Text style={styles.chipScore}>
                {Math.round(s.score_0_100)}
              </Text>
              <Text style={styles.chipTime}>
                {s.t_local.split(" ")[1] ?? s.t_local}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Detail panel */}
      {selected && (
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>
            {selected.t_local} — {selected.label.toUpperCase()} (
            {selected.score_0_100.toFixed(1)})
          </Text>

          <View style={styles.detailGrid}>
            <DetailItem label="Wind" value={fmtWind(selected)} />
            <DetailItem label="Waves" value={fmtWaves(selected)} />
            <DetailItem label="Tide" value={fmtTide(selected)} />
            <DetailItem label="Rain" value={fmtPrecip(selected)} />
            <DetailItem
              label="Fetch"
              value={
                selected.detail.fetch_nm != null
                  ? `${selected.detail.fetch_nm.toFixed(1)} nm`
                  : "—"
              }
            />
          </View>

          {selected.reasons.length > 0 && (
            <View style={styles.reasons}>
              {selected.reasons.map((r, i) => (
                <Text key={i} style={styles.reasonText}>
                  • {r}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function fmtWind(s: ScoreOut): string {
  const w = s.detail.wind_kt;
  if (w == null) return "—";
  const dir = s.detail.wind_dir_deg;
  return dir != null ? `${w.toFixed(0)} kt @ ${dir.toFixed(0)}°` : `${w.toFixed(0)} kt`;
}

function fmtWaves(s: ScoreOut): string {
  const h = s.detail.wave_ft;
  if (h == null) return "—";
  const p = s.detail.wave_period_s;
  return p != null ? `${h.toFixed(1)} ft / ${p.toFixed(0)}s` : `${h.toFixed(1)} ft`;
}

function fmtTide(s: ScoreOut): string {
  const t = s.detail.tide_ft;
  if (t == null) return "—";
  const phase = s.detail.tide_phase ?? "";
  return `${t.toFixed(1)} ft ${phase}`;
}

function fmtPrecip(s: ScoreOut): string {
  const p = s.detail.pop;
  if (p == null) return "—";
  return `${(p * 100).toFixed(0)}%`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1a1a2e",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: 340,
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: "center",
  },
  summaryItem: { marginRight: 20 },
  summaryLabel: { color: "#888", fontSize: 11 },
  summaryValue: { color: "#fff", fontSize: 20, fontWeight: "700" },
  dismissBtn: {
    marginLeft: "auto",
    padding: 8,
  },
  dismissText: { color: "#888", fontSize: 16, fontWeight: "600" },
  timeline: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 8,
  },
  timeChip: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 2,
    minWidth: 48,
  },
  chipScore: { color: "#fff", fontSize: 14, fontWeight: "700" },
  chipTime: { color: "rgba(255,255,255,0.8)", fontSize: 10 },
  detail: { paddingHorizontal: 16, paddingTop: 4 },
  detailTitle: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 6 },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  detailItem: {
    backgroundColor: "#16213e",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 4,
    marginBottom: 4,
  },
  detailLabel: { color: "#888", fontSize: 10 },
  detailValue: { color: "#fff", fontSize: 13, fontWeight: "500" },
  reasons: { marginTop: 6 },
  reasonText: { color: "#f59e0b", fontSize: 12, marginBottom: 2 },
});
