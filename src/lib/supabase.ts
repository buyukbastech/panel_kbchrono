import { createClient } from "@supabase/supabase-js";

// Development ortamında Vite eski değeri önbelleğe aldığı için tamamen statik tanımladık
const supabaseUrl = "https://oghxgtjnibzfxnzhddye.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naHhndGpuaWJ6ZnhuemhkZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDQxODAsImV4cCI6MjA5MjE4MDE4MH0.rXRG65ZwDKsZYYHf9uogPT9fuvheDk3DxRVgLuQxnf4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
