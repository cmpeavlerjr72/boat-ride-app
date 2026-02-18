import { BoatProfile, Boat, LatLon } from "./index";

export type AuthStackParamList = {
  Auth: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  BoatsTab: undefined;
  RoutesTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  BoatSetup: undefined;
  Map: { boat: BoatProfile; loadRoute?: LatLon[] };
};

export type BoatsStackParamList = {
  BoatList: undefined;
  BoatEdit: { boat?: Boat };
};

export type RoutesStackParamList = {
  SavedRoutes: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
};
