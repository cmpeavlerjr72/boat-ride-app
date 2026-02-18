export interface LatLon {
  lat: number;
  lon: number;
}

export interface RoutePointIn {
  lat: number;
  lon: number;
  name?: string;
  fetch_nm?: number;
  waterway?: string;
}

export interface BoatProfile {
  name: string;
  length_ft: number;
  beam_ft: number;
  draft_ft: number;
  comfort_bias: number;
  max_safe_wind_kt: number;
  max_safe_wave_ft: number;
}

export type WaterType = "auto" | "lake" | "tidal";

export interface ScoreRouteRequest {
  route: RoutePointIn[];
  start_time: string;
  end_time: string;
  timezone: string;
  sample_every_minutes: number;
  boat?: BoatProfile;
  provider?: string;
  water_type?: WaterType;
}

export interface ScoreDetail {
  wind_kt?: number;
  wind_dir_deg?: number;
  wave_ft?: number;
  wave_period_s?: number;
  fetch_nm?: number;
  tide_ft?: number;
  tide_phase?: string;
  tide_rate_ft_per_hr?: number;
  pop?: number;
  [key: string]: unknown;
}

export interface ScoreOut {
  t_local: string;
  lat: number;
  lon: number;
  score_0_100: number;
  label: "great" | "ok" | "rough" | "avoid";
  reasons: string[];
  detail: ScoreDetail;
}

export interface ScoreRouteResponse {
  scores: ScoreOut[];
  trip_id: string;
  water_type_used?: "lake" | "tidal";
}

export const SCORE_COLORS: Record<ScoreOut["label"], string> = {
  great: "#22c55e",
  ok: "#eab308",
  rough: "#f97316",
  avoid: "#ef4444",
};

export const DEFAULT_BOAT: BoatProfile = {
  name: "22ft Center Console",
  length_ft: 22,
  beam_ft: 8.5,
  draft_ft: 1.5,
  comfort_bias: 0.0,
  max_safe_wind_kt: 25,
  max_safe_wave_ft: 4.0,
};

// --- Boat types & server-managed boats ---

export type BoatType =
  | "center_console"
  | "bay_boat"
  | "deck_boat"
  | "pontoon"
  | "cabin_cruiser"
  | "sailboat"
  | "kayak"
  | "jet_ski"
  | "skiff"
  | "catamaran"
  | "wake_boat";

export interface Boat {
  id: string;
  user_id: string | null;
  is_preset: boolean;
  name: string;
  make: string | null;
  model: string | null;
  boat_type: BoatType;
  length_ft: number;
  beam_ft: number;
  draft_ft: number;
  weight_lbs: number | null;
  hull_type: string | null;
  max_safe_wind_kt: number;
  max_safe_wave_ft: number;
  comfort_bias: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBoatRequest {
  name: string;
  boat_type: BoatType;
  length_ft: number;
  beam_ft: number;
  draft_ft: number;
  weight_lbs?: number;
  hull_type?: string;
  max_safe_wind_kt: number;
  max_safe_wave_ft: number;
  comfort_bias?: number;
}

export interface UpdateBoatRequest extends Partial<CreateBoatRequest> {}

// --- User profiles ---

export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type UnitSystem = "imperial" | "metric";

export interface UserProfile {
  id: string;
  display_name: string | null;
  experience_level: ExperienceLevel;
  home_region: string | null;
  home_lat: number | null;
  home_lon: number | null;
  units: UnitSystem;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
  experience_level?: ExperienceLevel;
  home_region?: string;
  home_lat?: number;
  home_lon?: number;
  units?: UnitSystem;
}

// --- Saved routes ---

export interface SavedRoute {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  route_points: LatLon[];
  region: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRouteRequest {
  name: string;
  description?: string;
  route_points: LatLon[];
  region?: string;
}

export interface UpdateRouteRequest extends Partial<CreateRouteRequest> {}

// --- Crowdsource reports ---

export type ReportType =
  | "ride_quality"
  | "hazard"
  | "traffic"
  | "sandbar"
  | "fuel"
  | "weather";

export interface Report {
  id: string;
  user_id: string;
  report_type: ReportType;
  lat: number;
  lon: number;
  data: Record<string, unknown>;
  expires_at: string | null;
  confirmations: number;
  created_at: string;
}

export interface CreateReportRequest {
  report_type: ReportType;
  lat: number;
  lon: number;
  data?: Record<string, unknown>;
  expires_at?: string;
}

// --- Scoring feedback ---

export interface ScoringFeedbackRequest {
  lat: number;
  lon: number;
  original_score: number;
  user_rating: 1 | 2 | 3 | 4 | 5;
  conditions_snapshot?: Record<string, unknown>;
  comment?: string;
}

// --- Scoring preferences ---

export interface ScoringPreferences {
  comfort_bias: number;
  [key: string]: unknown;
}

// --- Report marker colors ---

export const REPORT_COLORS: Record<ReportType, string> = {
  ride_quality: "#3b82f6",
  hazard: "#ef4444",
  traffic: "#f97316",
  sandbar: "#eab308",
  fuel: "#22c55e",
  weather: "#8b5cf6",
};
