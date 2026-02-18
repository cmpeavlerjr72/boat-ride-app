import React from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import {
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  BoatsStackParamList,
  RoutesStackParamList,
  ProfileStackParamList,
} from "./src/types/navigation";

import AuthScreen from "./src/screens/AuthScreen";
import HomeScreen from "./src/screens/HomeScreen";
import BoatSetupScreen from "./src/screens/BoatSetupScreen";
import MapScreen from "./src/screens/MapScreen";
import BoatListScreen from "./src/screens/BoatListScreen";
import BoatEditScreen from "./src/screens/BoatEditScreen";
import SavedRoutesScreen from "./src/screens/SavedRoutesScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#0d1117",
    card: "#161b22",
    text: "#f0f6fc",
    border: "#30363d",
    primary: "#58a6ff",
  },
};

const screenOptions = {
  headerStyle: {
    backgroundColor: "#161b22",
  },
  headerTintColor: "#f0f6fc",
  headerTitleStyle: { fontWeight: "700" as const },
  headerShadowVisible: false,
};

// --- Auth Stack ---
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Auth" component={AuthScreen} />
    </AuthStackNav.Navigator>
  );
}

// --- Home Stack ---
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={screenOptions}>
      <HomeStackNav.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStackNav.Screen
        name="BoatSetup"
        component={BoatSetupScreen}
        options={{ title: "Boat Setup" }}
      />
      <HomeStackNav.Screen
        name="Map"
        component={MapScreen}
        options={{ title: "SmoothSailor" }}
      />
    </HomeStackNav.Navigator>
  );
}

// --- Boats Stack ---
const BoatsStackNav = createNativeStackNavigator<BoatsStackParamList>();
function BoatsStack() {
  return (
    <BoatsStackNav.Navigator screenOptions={screenOptions}>
      <BoatsStackNav.Screen
        name="BoatList"
        component={BoatListScreen}
        options={{ title: "Boats" }}
      />
      <BoatsStackNav.Screen
        name="BoatEdit"
        component={BoatEditScreen}
        options={({ route }) => ({
          title: route.params?.boat ? "Edit Boat" : "New Boat",
        })}
      />
    </BoatsStackNav.Navigator>
  );
}

// --- Routes Stack ---
const RoutesStackNav = createNativeStackNavigator<RoutesStackParamList>();
function RoutesStack() {
  return (
    <RoutesStackNav.Navigator screenOptions={screenOptions}>
      <RoutesStackNav.Screen
        name="SavedRoutes"
        component={SavedRoutesScreen}
        options={{ title: "Saved Routes" }}
      />
    </RoutesStackNav.Navigator>
  );
}

// --- Profile Stack ---
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();
function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={screenOptions}>
      <ProfileStackNav.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </ProfileStackNav.Navigator>
  );
}

// --- Main Tabs ---
const Tab = createBottomTabNavigator<MainTabParamList>();
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#161b22",
          borderTopColor: "#30363d",
          borderTopWidth: 1,
          paddingTop: 4,
        },
        tabBarActiveTintColor: "#58a6ff",
        tabBarInactiveTintColor: "#8b949e",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BoatsTab"
        component={BoatsStack}
        options={{
          tabBarLabel: "Boats",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "boat" : "boat-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RoutesTab"
        component={RoutesStack}
        options={{
          tabBarLabel: "Routes",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// --- Root ---
function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0d1117",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#58a6ff" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" />
      {session ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
