import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { BoatType } from "../types";

const BOAT_TYPES: { value: BoatType; label: string }[] = [
  { value: "center_console", label: "Center Console" },
  { value: "bay_boat", label: "Bay Boat" },
  { value: "deck_boat", label: "Deck Boat" },
  { value: "pontoon", label: "Pontoon" },
  { value: "wake_boat", label: "Wake Boat" },
  { value: "cabin_cruiser", label: "Cabin Cruiser" },
  { value: "sailboat", label: "Sailboat" },
  { value: "kayak", label: "Kayak" },
  { value: "jet_ski", label: "Jet Ski" },
  { value: "skiff", label: "Skiff" },
  { value: "catamaran", label: "Catamaran" },
];

interface Props {
  visible: boolean;
  selected: BoatType;
  onSelect: (type: BoatType) => void;
  onClose: () => void;
}

export default function BoatTypePicker({
  visible,
  selected,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Select Boat Type</Text>
          <FlatList
            data={BOAT_TYPES}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.option,
                  item.value === selected && styles.optionSelected,
                ]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    item.value === selected && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function boatTypeLabel(type: BoatType): string {
  return BOAT_TYPES.find((t) => t.value === type)?.label ?? type;
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
    padding: 20,
    maxHeight: "70%",
  },
  title: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionSelected: { backgroundColor: "#1f6feb" },
  optionText: { color: "#c9d1d9", fontSize: 16 },
  optionTextSelected: { color: "#fff", fontWeight: "600" },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { color: "#58a6ff", fontSize: 16, fontWeight: "600" },
});
