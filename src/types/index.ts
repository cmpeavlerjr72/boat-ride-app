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

export interface ScoreRouteRequest {
  route: RoutePointIn[];
  start_time: string;
  end_time: string;
  timezone: string;
  sample_every_minutes: number;
  boat?: BoatProfile;
  provider?: string;
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
