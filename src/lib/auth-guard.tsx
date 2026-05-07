import { useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { redirect } from "@tanstack/react-router";
import { supabase } from "./supabase";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 dakika

// Route beforeLoad için -> render edilmeden önce oturumu kontrol eder
export async function requireAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) {
    throw redirect({ to: "/login" });
  }
  return { user };
}

// Bileşen içi hook -> 30 dakika inaktivite sayacı
export function useInactivityLogout() {
  const navigate = useNavigate();
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("crm_pass");
    navigate({ to: "/login" });
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetTimer]);
}
