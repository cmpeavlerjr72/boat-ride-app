import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Boat, BoatType } from "../types";
import { getBoats, getBoatPresets, deleteBoat, createBoat } from "../api/client";
import { boatToProfile } from "../utils/boat";
import { boatTypeLabel } from "../components/BoatTypePicker";
import {
  BoatsStackParamList,
  MainTabParamList,
} from "../types/navigation";

type BoatsNav = NativeStackNavigationProp<BoatsStackParamList, "BoatList">;
type TabNav = BottomTabNavigationProp<MainTabParamList>;

/** Display order for preset type groups */
const TYPE_ORDER: BoatType[] = [
  "center_console",
  "bay_boat",
  "pontoon",
  "wake_boat",
  "cabin_cruiser",
  "skiff",
  "deck_boat",
  "sailboat",
  "kayak",
  "jet_ski",
  "catamaran",
];

function groupByType(boats: Boat[]): { type: BoatType; boats: Boat[] }[] {
  const map = new Map<BoatType, Boat[]>();
  for (const b of boats) {
    const list = map.get(b.boat_type) ?? [];
    list.push(b);
    map.set(b.boat_type, list);
  }
  return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({
    type: t,
    boats: map.get(t)!,
  }));
}

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

function showAlert(title: string, msg: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

export default function BoatListScreen() {
  const navigation = useNavigation<BoatsNav>();
  const tabNav = useNavigation<TabNav>();
  const [myBoats, setMyBoats] = useState<Boat[]>([]);
  const [presets, setPresets] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const presetGroups = useMemo(() => groupByType(presets), [presets]);

  // Names of boats already in "My Boats" so we can show which presets are already added
  const myBoatNames = useMemo(
    () => new Set(myBoats.map((b) => b.name)),
    [myBoats]
  );

  const loadBoats = useCallback(async () => {
    const [mineResult, presetResult] = await Promise.allSettled([
      getBoats(),
      getBoatPresets(),
    ]);
    if (mineResult.status === "fulfilled") {
      // GET /boats returns user boats + presets combined — only show user-owned boats
      setMyBoats(mineResult.value.filter((b) => !b.is_preset));
    }
    if (presetResult.status === "fulfilled") setPresets(presetResult.value);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBoats();
    }, [loadBoats])
  );

  const handleDelete = (boat: Boat) => {
    showConfirm("Delete Boat", `Delete "${boat.name}"?`, async () => {
      try {
        await deleteBoat(boat.id);
        setMyBoats((prev) => prev.filter((b) => b.id !== boat.id));
        showAlert("Deleted", `"${boat.name}" removed from your boats.`);
      } catch (e: any) {
        showAlert("Delete Failed", e.message ?? "Something went wrong.");
      }
    });
  };

  const handleSelect = (boat: Boat) => {
    tabNav.navigate("HomeTab", {
      screen: "Map",
      params: { boat: boatToProfile(boat) },
    } as any);
  };

  const handleAddPreset = async (preset: Boat) => {
    setAddingId(preset.id);
    try {
      const newBoat = await createBoat({
        name: preset.make && preset.model
          ? `${preset.make} ${preset.model}`
          : preset.name,
        boat_type: preset.boat_type,
        length_ft: preset.length_ft,
        beam_ft: preset.beam_ft,
        draft_ft: preset.draft_ft,
        weight_lbs: preset.weight_lbs ?? undefined,
        hull_type: preset.hull_type ?? undefined,
        max_safe_wind_kt: preset.max_safe_wind_kt,
        max_safe_wave_ft: preset.max_safe_wave_ft,
        comfort_bias: preset.comfort_bias,
      });
      setMyBoats((prev) => [...prev, newBoat]);
      showAlert("Added", `"${newBoat.name}" added to your boats.`);
    } catch (e: any) {
      showAlert("Add Failed", e.message ?? "Something went wrong.");
    } finally {
      setAddingId(null);
    }
  };

  const renderMyBoat = (boat: Boat) => (
    <TouchableOpacity
      style={styles.boatCard}
      onPress={() => handleSelect(boat)}
    >
      <View style={styles.boatInfo}>
        <Text style={styles.boatName}>{boat.name}</Text>
        <Text style={styles.boatDetail}>
          {boatTypeLabel(boat.boat_type)} | {boat.length_ft}ft |{" "}
          Wind {boat.max_safe_wind_kt}kt | Wave {boat.max_safe_wave_ft}ft
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(boat)}
      >
        <Text style={styles.deleteText}>X</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPresetBoat = (boat: Boat) => {
    const displayName = boat.make && boat.model
      ? `${boat.make} ${boat.model}`
      : boat.name;
    const alreadyAdded = myBoatNames.has(displayName);

    return (
      <View style={styles.presetRow}>
        <TouchableOpacity
          style={[styles.boatCard, styles.presetCard]}
          onPress={() => handleSelect(boat)}
        >
          <View style={styles.boatInfo}>
            <Text style={styles.boatName}>{displayName}</Text>
            <Text style={styles.boatDetail}>
              {boat.length_ft}ft | Beam {boat.beam_ft}ft | Draft {boat.draft_ft}ft
            </Text>
            <Text style={styles.boatSpecs}>
              Wind {boat.max_safe_wind_kt}kt | Wave {boat.max_safe_wave_ft}ft
            </Text>
          </View>
        </TouchableOpacity>
        {alreadyAdded ? (
          <View style={styles.addedBadge}>
            <Text style={styles.addedText}>Added</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addPresetBtn}
            onPress={() => handleAddPreset(boat)}
            disabled={addingId === boat.id}
          >
            {addingId === boat.id ? (
              <ActivityIndicator color="#3fb950" size="small" />
            ) : (
              <Text style={styles.addPresetText}>+</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#58a6ff" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.list}
      data={[]}
      renderItem={() => null}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadBoats();
          }}
          tintColor="#58a6ff"
        />
      }
      ListHeaderComponent={
        <>
          {/* ── My Boats ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Boats</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("BoatEdit", {})}
            >
              <Text style={styles.addBtnText}>+ Custom</Text>
            </TouchableOpacity>
          </View>
          {myBoats.length === 0 ? (
            <Text style={styles.emptyText}>
              No boats yet. Add a popular model below or create a custom one.
            </Text>
          ) : (
            myBoats.map((b) => (
              <View key={b.id}>{renderMyBoat(b)}</View>
            ))
          )}

          {/* ── Popular Models ── */}
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <Text style={styles.sectionTitle}>Popular Models</Text>
          </View>
          <Text style={styles.hintText}>
            Tap a model to use for scoring, or tap + to add it to your boats.
          </Text>

          {presetGroups.map((group) => (
            <View key={group.type} style={styles.typeGroup}>
              <Text style={styles.typeGroupLabel}>
                {boatTypeLabel(group.type)}
              </Text>
              {group.boats.map((b) => (
                <View key={b.id}>{renderPresetBoat(b)}</View>
              ))}
            </View>
          ))}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1117" },
  list: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    backgroundColor: "#0d1117",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: "#f0f6fc", fontSize: 18, fontWeight: "700" },
  addBtn: {
    backgroundColor: "#238636",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  hintText: {
    color: "#8b949e",
    fontSize: 13,
    marginBottom: 16,
  },
  typeGroup: {
    marginBottom: 16,
  },
  typeGroupLabel: {
    color: "#58a6ff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  boatCard: {
    flex: 1,
    backgroundColor: "#161b22",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#30363d",
    borderLeftWidth: 3,
    borderLeftColor: "#58a6ff",
  },
  presetCard: {
    borderLeftColor: "#484f58",
    marginBottom: 0,
  },
  boatInfo: { flex: 1 },
  boatName: { color: "#f0f6fc", fontSize: 16, fontWeight: "600" },
  boatDetail: { color: "#8b949e", fontSize: 13, marginTop: 4 },
  boatSpecs: { color: "#484f58", fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { color: "#f85149", fontSize: 16, fontWeight: "600" },
  emptyText: {
    color: "#484f58",
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  addPresetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#3fb950",
    alignItems: "center",
    justifyContent: "center",
  },
  addPresetText: {
    color: "#3fb950",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
  },
  addedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(63,185,80,0.1)",
    borderWidth: 1,
    borderColor: "rgba(63,185,80,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  addedText: {
    color: "#3fb950",
    fontSize: 9,
    fontWeight: "700",
  },
});
