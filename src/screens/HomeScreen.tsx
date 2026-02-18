import React, { useState, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../types/navigation";
import { useAuth } from "../context/AuthContext";
import { getProfile } from "../api/client";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getProfile()
        .then((p) => setDisplayName(p.display_name ?? null))
        .catch(() => {});
    }, [])
  );

  const greeting = displayName || user?.email?.split("@")[0] || "Captain";

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Image
          source={require("../../assets/SmoothSailorBlueWordMark.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.welcome}>
          Welcome back, <Text style={styles.welcomeName}>{greeting}</Text>
        </Text>

        <Text style={styles.tagline}>
          Score your route before you leave the dock.{"\n"}
          Plan smarter, ride smoother.
        </Text>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => navigation.navigate("BoatSetup")}
          activeOpacity={0.8}
        >
          <View style={styles.startBtnInner}>
            <Ionicons name="compass" size={22} color="#fff" />
            <Text style={styles.startBtnText}>Start New Trip</Text>
            <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>

        <View style={styles.featureRow}>
          <View style={styles.featureItem}>
            <Ionicons name="thunderstorm-outline" size={20} color="#58a6ff" />
            <Text style={styles.featureText}>Live weather</Text>
          </View>
          <View style={styles.featureDot} />
          <View style={styles.featureItem}>
            <Ionicons name="water-outline" size={20} color="#58a6ff" />
            <Text style={styles.featureText}>Wave data</Text>
          </View>
          <View style={styles.featureDot} />
          <View style={styles.featureItem}>
            <Ionicons name="analytics-outline" size={20} color="#58a6ff" />
            <Text style={styles.featureText}>Route scores</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0d1117",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 4,
  },
  welcome: {
    color: "#c9d1d9",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 8,
  },
  welcomeName: {
    color: "#f0f6fc",
    fontWeight: "700",
  },
  tagline: {
    color: "#8b949e",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  startBtn: {
    backgroundColor: "#238636",
    borderRadius: 12,
    width: "100%",
    shadowColor: "#238636",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    gap: 12,
  },
  featureItem: {
    alignItems: "center",
    gap: 4,
  },
  featureText: {
    color: "#8b949e",
    fontSize: 12,
    fontWeight: "500",
  },
  featureDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#30363d",
  },
});
