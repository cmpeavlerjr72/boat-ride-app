import { Boat, BoatProfile } from "../types";

export function boatToProfile(boat: Boat): BoatProfile {
  return {
    name: boat.name,
    length_ft: boat.length_ft,
    beam_ft: boat.beam_ft,
    draft_ft: boat.draft_ft,
    comfort_bias: boat.comfort_bias,
    max_safe_wind_kt: boat.max_safe_wind_kt,
    max_safe_wave_ft: boat.max_safe_wave_ft,
  };
}
