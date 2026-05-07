import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "./supabase";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;  // 30 dakika
const WARNING_BEFORE    =  2 * 60 * 1000;   // son 2 dakikada uyar

// ─── Route guard ──────────────────────────────────────────────────────────────
export async function requireAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) {
    throw redirect({ to: "/login" });
  }
  return { user };
}

// ─── Inactivity hook ──────────────────────────────────────────────────────────
export function useInactivityLogout() {
  const navigate       = useNavigate();
  const logoutTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningToastId = useRef<string | number | null>(null);
  const warned         = useRef(false);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Uyarı tostu varsa kapat
    if (warningToastId.current !== null) {
      toast.dismiss(warningToastId.current);
      warningToastId.current = null;
    }
    await supabase.auth.signOut();
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("crm_pass");
    toast.warning("Güvenlik nedeniyle oturumunuz sonlandırıldı.", {
      description: "Devam etmek için tekrar giriş yapın.",
      duration: 5000,
    });
    navigate({ to: "/login" });
  }, [navigate]);

  // ── Warning toast ──────────────────────────────────────────────────────────
  const showWarning = useCallback(() => {
    warned.current = true;
    warningToastId.current = toast("⏰ Oturum süreniz bitiyor", {
      description: "2 dakika içinde hareketsizlik nedeniyle çıkış yapılacak. Devam etmek için sayfayla etkileşime girin.",
      duration: WARNING_BEFORE,
      action: {
        label: "Oturumu Uzat",
        onClick: () => {
          // resetTimer aşağıda tanımlanıyor, burada sadece dismiss yeterli
          // resetTimer çağrısı event listener üzerinden tetiklenecek
          toast.dismiss(warningToastId.current!);
          warningToastId.current = null;
          warned.current = false;
        },
      },
    }) as string | number;
  }, []);

  // ── Timer reset ────────────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    // Önceki zamanlayıcıları temizle
    if (logoutTimer.current)  clearTimeout(logoutTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    // Uyarı tostu açıksa kapat ve sıfırla
    if (warned.current && warningToastId.current !== null) {
      toast.dismiss(warningToastId.current);
      warningToastId.current = null;
      warned.current = false;
    }

    // Uyarıyı (28 dk sonra) ve çıkışı (30 dk sonra) planla
    warningTimer.current = setTimeout(showWarning, INACTIVITY_TIMEOUT - WARNING_BEFORE);
    logoutTimer.current  = setTimeout(logout,      INACTIVITY_TIMEOUT);
  }, [logout, showWarning]);

  // ── Event listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const events = [
      "mousemove", "mousedown", "keydown",
      "touchstart", "scroll", "click", "visibilitychange",
    ];

    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // İlk tetikleme

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (logoutTimer.current)  clearTimeout(logoutTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (warningToastId.current !== null) toast.dismiss(warningToastId.current);
    };
  }, [resetTimer]);
}
