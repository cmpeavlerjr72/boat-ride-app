import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getProfile, updateProfile, deleteAccount } from "../api/client";
import {
  ExperienceLevel,
  UnitSystem,
  UserProfile,
} from "../types";
import HomeLocationPicker from "../components/HomeLocationPicker";

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>("intermediate");
  const [homeRegion, setHomeRegion] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLon, setHomeLon] = useState<number | null>(null);
  const [units, setUnits] = useState<UnitSystem>("imperial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const p = await getProfile();
          if (!active) return;
          setProfile(p);
          setDisplayName(p.display_name ?? "");
          setExperienceLevel(p.experience_level);
          setHomeRegion(p.home_region ?? "");
          setHomeLat(p.home_lat);
          setHomeLon(p.home_lon);
          setUnits(p.units);
        } catch (e: any) {
          console.warn("Failed to load profile:", e.message);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const handleLocationConfirm = (lat: number, lon: number, displayName: string) => {
    setHomeLat(lat);
    setHomeLon(lon);
    setHomeRegion(displayName);
    setShowLocationPicker(false);
  };

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        display_name: displayName.trim() || undefined,
        experience_level: experienceLevel,
        home_region: homeRegion.trim() || undefined,
        home_lat: homeLat ?? undefined,
        home_lon: homeLon ?? undefined,
        units,
      });
      setProfile(updated);
      showAlert("Profile Saved", "Your profile has been updated.");
    } catch (e: any) {
      showAlert("Save Failed", e.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e: any) {
      console.warn("Sign out failed:", e.message);
    }
  };

  const handleDeleteAccount = () => {
    const doDelete = async () => {
      setDeleting(true);
      try {
        await deleteAccount();
        await signOut();
      } catch (e: any) {
        showAlert(
          "Delete Failed",
          e.message ?? "Something went wrong. Please try again."
        );
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data (profile, boats, routes, and reports) will be removed."
        )
      ) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Delete Account",
        "Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data (profile, boats, routes, and reports) will be removed.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

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
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholderTextColor="#555"
            placeholder="Your name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Experience Level</Text>
          <View style={styles.chipRow}>
            {EXPERIENCE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.chip,
                  experienceLevel === level && styles.chipActive,
                ]}
                onPress={() => setExperienceLevel(level)}
              >
                <Text
                  style={[
                    styles.chipText,
                    experienceLevel === level && styles.chipTextActive,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Home Region</Text>
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={() => setShowLocationPicker(true)}
          >
            {homeRegion ? (
              <View>
                <Text style={styles.locationBtnName}>{homeRegion}</Text>
                {homeLat != null && homeLon != null && (
                  <Text style={styles.locationBtnCoords}>
                    {homeLat.toFixed(4)}, {homeLon.toFixed(4)}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.locationBtnPlaceholder}>
                Tap to set your home location
              </Text>
            )}
            <Text style={styles.locationBtnAction}>
              {homeRegion ? "Change" : "Set"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Units</Text>
          <View style={styles.chipRow}>
            {(["imperial", "metric"] as UnitSystem[]).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.chip, units === u && styles.chipActive]}
                onPress={() => setUnits(u)}
              >
                <Text
                  style={[
                    styles.chipText,
                    units === u && styles.chipTextActive,
                  ]}
                >
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Profile</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, deleting && styles.saveBtnDisabled]}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#f85149" />
          ) : (
            <Text style={styles.deleteText}>Delete Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <HomeLocationPicker
        visible={showLocationPicker}
        currentLat={homeLat}
        currentLon={homeLon}
        onConfirm={handleLocationConfirm}
        onCancel={() => setShowLocationPicker(false)}
      />
    </KeyboardAvoidingView>
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
  email: {
    color: "#58a6ff",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  chipActive: {
    backgroundColor: "#1f6feb",
    borderColor: "#58a6ff",
  },
  chipText: { color: "#8b949e", fontSize: 14 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#238636",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  signOutBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(248,81,73,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,81,73,0.4)",
  },
  signOutText: { color: "#f85149", fontSize: 16, fontWeight: "600" },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(248,81,73,0.15)",
    borderWidth: 1,
    borderColor: "#f85149",
  },
  deleteText: { color: "#f85149", fontSize: 16, fontWeight: "700" },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1117",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  locationBtnName: {
    color: "#f0f6fc",
    fontSize: 15,
    fontWeight: "600",
  },
  locationBtnCoords: {
    color: "#8b949e",
    fontSize: 12,
    marginTop: 1,
  },
  locationBtnPlaceholder: {
    color: "#484f58",
    fontSize: 15,
  },
  locationBtnAction: {
    color: "#58a6ff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: "auto",
  },
});
