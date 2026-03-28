import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null =
  isConfigured ? createClient(supabaseUrl!, supabaseKey!) : null;
