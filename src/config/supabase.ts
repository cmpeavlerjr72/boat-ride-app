import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const SUPABASE_URL = "https://mnzxhqxvxdfrtrawcxat.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uenhocXh2eGRmcnRyYXdjeGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjY0ODEsImV4cCI6MjA4Njk0MjQ4MX0.h5m8pUPEeKhmFO9WbS8dfeQanB_3kXhs3vPgGKvNmkE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
