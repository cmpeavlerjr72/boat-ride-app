import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";

interface Props {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ITEM_H = 44;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

// ─── Wheel Picker ────────────────────────────────────────────────

function WheelPicker({
  items,
  selectedIndex,
  onSelect,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const ignoreNext = useRef(false);

  useEffect(() => {
    // Scroll to initial position without animation
    setTimeout(() => {
      ignoreNext.current = true;
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 50);
  }, []);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (ignoreNext.current) {
        ignoreNext.current = false;
        return;
      }
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      onSelect(clamped);
    },
    [items.length, onSelect]
  );

  return (
    <View style={wheelStyles.container}>
      {/* Selection highlight bar */}
      <View style={wheelStyles.highlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
        nestedScrollEnabled
      >
        {items.map((item, i) => (
          <View key={i} style={wheelStyles.item}>
            <Text
              style={[
                wheelStyles.itemText,
                i === selectedIndex && wheelStyles.itemTextSelected,
              ]}
            >
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: {
    height: WHEEL_H,
    overflow: "hidden",
    flex: 1,
  },
  highlight: {
    position: "absolute",
    top: PAD,
    left: 4,
    right: 4,
    height: ITEM_H,
    backgroundColor: "rgba(88,166,255,0.12)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(88,166,255,0.25)",
    zIndex: 1,
  },
  item: {
    height: ITEM_H,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    fontSize: 18,
    color: "#484f58",
    fontWeight: "500",
  },
  itemTextSelected: {
    color: "#f0f6fc",
    fontWeight: "700",
    fontSize: 20,
  },
});

// ─── Calendar ────────────────────────────────────────────────────

function MiniCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
}) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const selY = selectedDate.getFullYear();
  const selM = selectedDate.getMonth();
  const selD = selectedDate.getDate();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  return (
    <View>
      {/* Month navigation */}
      <View style={calStyles.header}>
        <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
          <Text style={calStyles.navText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
          <Text style={calStyles.navText}>{">"}</Text>
        </TouchableOpacity>
      </View>

      {/* Day of week headers */}
      <View style={calStyles.weekRow}>
        {DAYS.map((d) => (
          <Text key={d} style={calStyles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={calStyles.grid}>
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={`empty-${i}`} style={calStyles.cell} />;
          }
          const isSelected =
            viewYear === selY && viewMonth === selM && day === selD;
          const isToday =
            viewYear === todayY && viewMonth === todayM && day === todayD;
          const cellDate = new Date(viewYear, viewMonth, day);
          const isPast = cellDate < today;

          return (
            <TouchableOpacity
              key={`day-${day}`}
              style={[
                calStyles.cell,
                isSelected && calStyles.cellSelected,
                isToday && !isSelected && calStyles.cellToday,
              ]}
              onPress={() => onSelect(new Date(viewYear, viewMonth, day))}
            >
              <Text
                style={[
                  calStyles.dayText,
                  isPast && !isSelected && calStyles.dayTextPast,
                  isSelected && calStyles.dayTextSelected,
                  isToday && !isSelected && calStyles.dayTextToday,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#21262d",
    alignItems: "center",
    justifyContent: "center",
  },
  navText: { color: "#58a6ff", fontSize: 18, fontWeight: "700" },
  monthLabel: {
    color: "#f0f6fc",
    fontSize: 16,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    color: "#8b949e",
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  cellSelected: {
    backgroundColor: "#1f6feb",
  },
  cellToday: {
    borderWidth: 1,
    borderColor: "#58a6ff",
  },
  dayText: {
    color: "#c9d1d9",
    fontSize: 14,
    fontWeight: "500",
  },
  dayTextPast: {
    color: "#484f58",
  },
  dayTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  dayTextToday: {
    color: "#58a6ff",
    fontWeight: "700",
  },
});

// ─── Main Modal ──────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
);

export default function DateTimePickerModal({
  visible,
  value,
  onConfirm,
  onCancel,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(value);
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(
    Math.round(value.getMinutes() / 5) * 5
  );

  // Reset state when modal opens with new value
  useEffect(() => {
    if (visible) {
      setSelectedDate(value);
      setHour(value.getHours());
      setMinute(Math.round(value.getMinutes() / 5) * 5);
    }
  }, [visible]);

  const handleConfirm = () => {
    const result = new Date(selectedDate);
    result.setHours(hour, minute, 0, 0);
    onConfirm(result);
  };

  const handleDateSelect = (d: Date) => {
    setSelectedDate(d);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Select Departure</Text>

          {/* Calendar */}
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={handleDateSelect}
          />

          {/* Time wheels */}
          <Text style={styles.timeLabel}>Time</Text>
          <View style={styles.wheelRow}>
            <WheelPicker
              items={HOURS}
              selectedIndex={hour}
              onSelect={setHour}
            />
            <Text style={styles.colon}>:</Text>
            <WheelPicker
              items={MINUTES}
              selectedIndex={Math.round(minute / 5)}
              onSelect={(i) => setMinute(i * 5)}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  timeLabel: {
    color: "#8b949e",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  wheelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  colon: {
    color: "#f0f6fc",
    fontSize: 24,
    fontWeight: "700",
    marginHorizontal: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
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
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
