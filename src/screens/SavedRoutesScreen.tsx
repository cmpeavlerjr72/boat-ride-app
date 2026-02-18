import React, { useState, useCallback } from "react";
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
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { SavedRoute } from "../types";
import { getRoutes, deleteRoute } from "../api/client";
import { MainTabParamList } from "../types/navigation";

type TabNav = BottomTabNavigationProp<MainTabParamList>;

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

export default function SavedRoutesScreen() {
  const tabNav = useNavigation<TabNav>();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoutes = useCallback(async () => {
    try {
      const data = await getRoutes();
      setRoutes(data);
    } catch (e: any) {
      console.warn("Failed to load routes:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRoutes();
    }, [loadRoutes])
  );

  const handleDelete = (route: SavedRoute) => {
    showConfirm("Delete Route", `Delete "${route.name}"?`, async () => {
      try {
        await deleteRoute(route.id);
        setRoutes((prev) => prev.filter((r) => r.id !== route.id));
      } catch (e: any) {
        console.warn("Delete failed:", e.message);
      }
    });
  };

  const handleSelect = (route: SavedRoute) => {
    tabNav.navigate("HomeTab", {
      screen: "Map",
      params: {
        boat: {
          name: "Default",
          length_ft: 22,
          beam_ft: 8.5,
          draft_ft: 1.5,
          comfort_bias: 0,
          max_safe_wind_kt: 25,
          max_safe_wave_ft: 4,
        },
        loadRoute: route.route_points,
      },
    } as any);
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
      contentContainerStyle={routes.length === 0 ? styles.center : styles.list}
      data={routes}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadRoutes();
          }}
          tintColor="#58a6ff"
        />
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          No saved routes yet. Score a route on the map, then save it!
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.routeCard}
          onPress={() => handleSelect(item)}
          onLongPress={() => handleDelete(item)}
        >
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.routeDesc} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
            <Text style={styles.routeMeta}>
              {item.route_points.length} points
              {item.region ? ` | ${item.region}` : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.deleteText}>X</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1117" },
  list: { padding: 16 },
  center: {
    flex: 1,
    backgroundColor: "#0d1117",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    color: "#8b949e",
    fontSize: 15,
    textAlign: "center",
    fontStyle: "italic",
  },
  routeCard: {
    backgroundColor: "#161b22",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#30363d",
    borderLeftWidth: 3,
    borderLeftColor: "#3fb950",
  },
  routeInfo: { flex: 1 },
  routeName: { color: "#f0f6fc", fontSize: 16, fontWeight: "600" },
  routeDesc: { color: "#8b949e", fontSize: 13, marginTop: 2 },
  routeMeta: { color: "#484f58", fontSize: 12, marginTop: 4 },
  deleteBtn: { padding: 8 },
  deleteText: { color: "#f85149", fontSize: 16, fontWeight: "600" },
});
