# Boat Ride App - React Native Frontend

## What This Is
Expo React Native app for scoring boating conditions. Users draw a route on a map, pick a time window, and get per-point ride quality scores (0-100) from the backend API.

## Backend API
- **Local dev**: `http://localhost:8000` (run `uvicorn boat_ride.api:app --reload` in the `boat-ride` repo)
- **Production**: `https://boat-ride-test.onrender.com`
- **Backend repo**: `../boat-ride/` — see its CLAUDE.md for full architecture

### API Contract
```
POST /score-route
{
  "route": [{"lat": 30.39, "lon": -88.88}, ...],
  "start_time": "2026-01-22 08:00",
  "end_time": "2026-01-22 12:00",
  "timezone": "America/New_York",
  "sample_every_minutes": 20,
  "boat": {"name": "My Boat", "length_ft": 22, "beam_ft": 8.5, "max_safe_wind_kt": 25, "max_safe_wave_ft": 4.0},
  "provider": "nws+ndbc+fetch+coops"
}

Response:
{
  "scores": [{
    "t_local": "2026-01-22 08:00",
    "lat": 30.39, "lon": -88.88,
    "score_0_100": 72.5,
    "label": "ok",       // "great" | "ok" | "rough" | "avoid"
    "reasons": ["Short period seas (3s)", "Strong tidal flow"],
    "detail": { "wind_kt": 12.0, "wave_ft": 1.8, "fetch_nm": 2.5, ... }
  }, ...],
  "trip_id": "api"
}
```

## Project Structure
```
src/
├── api/
│   └── client.ts         # API client - scoreRoute(), healthCheck()
├── types/
│   └── index.ts          # TypeScript types matching API contract
├── screens/
│   └── MapScreen.tsx      # Main screen: map + route drawing + results
└── components/
    ├── RouteMap.tsx        # Map with tap-to-add-point route drawing
    ├── TimePicker.tsx      # Start/end time selection
    └── ScoreCard.tsx       # Score result display
```

## Running
```bash
npm start              # Expo dev server
# Scan QR with Expo Go app on phone, or press 'w' for web
```

## Key Decisions
- react-native-maps for the map component
- Tap on map to add waypoints, long-press to remove last point
- Score button disabled until ≥2 route points and times are set
- Color-coded route segments: green (great), yellow (ok), orange (rough), red (avoid)
