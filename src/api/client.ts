import { supabase } from "../config/supabase";
import {
  ScoreRouteRequest,
  ScoreRouteResponse,
  Boat,
  CreateBoatRequest,
  UpdateBoatRequest,
  UserProfile,
  UpdateProfileRequest,
  SavedRoute,
  CreateRouteRequest,
  UpdateRouteRequest,
  Report,
  CreateReportRequest,
  ScoringFeedbackRequest,
  ScoringPreferences,
} from "../types";

const API_BASE = "https://boat-ride-api.onrender.com";

async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res;
}

// --- Scoring ---

export async function scoreRoute(
  req: ScoreRouteRequest
): Promise<ScoreRouteResponse> {
  const res = await authFetch("/score-route", {
    method: "POST",
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// --- User Profile ---

export async function getProfile(): Promise<UserProfile> {
  const res = await authFetch("/profiles/me");
  return res.json();
}

export async function updateProfile(
  data: UpdateProfileRequest
): Promise<UserProfile> {
  const res = await authFetch("/profiles/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteAccount(): Promise<void> {
  await authFetch("/profiles/account/me", { method: "DELETE" });
}

// --- Boats ---

export async function getBoatPresets(): Promise<Boat[]> {
  const res = await authFetch("/boats/presets");
  return res.json();
}

export async function getBoats(): Promise<Boat[]> {
  const res = await authFetch("/boats");
  return res.json();
}

export async function createBoat(data: CreateBoatRequest): Promise<Boat> {
  const res = await authFetch("/boats", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateBoat(
  id: string,
  data: UpdateBoatRequest
): Promise<Boat> {
  const res = await authFetch(`/boats/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteBoat(id: string): Promise<void> {
  await authFetch(`/boats/${id}`, { method: "DELETE" });
}

// --- Saved Routes ---

export async function getRoutes(): Promise<SavedRoute[]> {
  const res = await authFetch("/routes");
  return res.json();
}

export async function createRoute(
  data: CreateRouteRequest
): Promise<SavedRoute> {
  const res = await authFetch("/routes", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateRoute(
  id: string,
  data: UpdateRouteRequest
): Promise<SavedRoute> {
  const res = await authFetch(`/routes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteRoute(id: string): Promise<void> {
  await authFetch(`/routes/${id}`, { method: "DELETE" });
}

// --- Reports ---

export async function createReport(
  data: CreateReportRequest
): Promise<Report> {
  const res = await authFetch("/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getNearbyReports(
  lat: number,
  lon: number,
  radius_nm?: number
): Promise<Report[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  if (radius_nm != null) params.set("radius_nm", String(radius_nm));
  const res = await authFetch(`/reports/nearby?${params}`);
  return res.json();
}

export async function confirmReport(id: string): Promise<Report> {
  const res = await authFetch(`/reports/${id}/confirm`, { method: "POST" });
  return res.json();
}

export async function deleteReport(id: string): Promise<void> {
  await authFetch(`/reports/${id}`, { method: "DELETE" });
}

// --- Scoring Feedback ---

export async function submitFeedback(
  data: ScoringFeedbackRequest
): Promise<void> {
  await authFetch("/feedback", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Scoring Preferences ---

export async function getScoringPreferences(): Promise<ScoringPreferences> {
  const res = await authFetch("/scoring/preferences");
  return res.json();
}
