import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bell, Search, Settings, Shield, User, Mail, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Sidebar, MobileNav } from "@/components/admin/Sidebar";
import { UserMenu } from "@/components/admin/UserMenu";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { requireAuth, useInactivityLogout } from "@/lib/auth-guard";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  component: SettingsPage,
});

function SettingsPage() {
  useInactivityLogout();
  const [user, setUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    getProfile();
  }, []);

  return (
    <div className="relative flex min-h-screen text-foreground overflow-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gold/15 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-gold/10 blur-[120px]" />

      <Sidebar />

      <main className="flex-1 min-w-0 relative">
        <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-3.5">
            <div className="flex items-center gap-3 flex-1">
              <MobileNav />
              <div className="flex items-center gap-2 rounded-xl bg-surface/40 border border-border px-3.5 py-2 text-sm text-muted-foreground w-full max-w-md hover:border-gold/30 transition-colors group">
                <Search className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" strokeWidth={2} />
                <input placeholder="Ayarlarda ara…" className="bg-transparent w-full outline-none placeholder:text-muted-foreground text-foreground text-[13px]" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-8 py-8 animate-fade-up">
          <div className="flex items-start gap-4 mb-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold-soft border border-gold/20 shrink-0">
              <Settings className="h-6 w-6 text-gold" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                Ayarlar
              </h1>
              <p className="mt-1.5 text-muted-foreground text-[13px]">
                Hesap güvenliği ve sistem tercihlerini yönetin.
              </p>
            </div>
          </div>

          <div className="grid gap-8 max-w-4xl">
            {/* Account Section */}
            <section className="rounded-3xl glass-strong border border-border/40 overflow-hidden">
              <div className="px-7 py-5 border-b border-border/40 bg-white/5 flex items-center gap-3">
                <User className="h-4 w-4 text-gold" />
                <h3 className="font-display font-semibold">Hesap Bilgileri</h3>
              </div>
              
              <div className="p-7 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                      <Mail className="h-3 w-3" /> E-posta Adresi
                    </label>
                    <div className="relative group">
                      <input 
                        type="email" 
                        value={user?.email || ""} 
                        readOnly 
                        className="w-full rounded-xl border border-border bg-input/40 px-4 py-3 text-sm text-foreground focus:outline-none opacity-80"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                      <Lock className="h-3 w-3" /> Mevcut Parola
                    </label>
                    <div className="relative group">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={sessionStorage.getItem("crm_pass") || "••••••••"} 
                        readOnly 
                        className="w-full rounded-xl border border-border bg-input/40 px-4 py-3 text-sm text-foreground focus:outline-none cursor-default pr-12"
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted-foreground transition-colors"
                      >
                        {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 italic">
                      * Güvenlik nedeniyle parola değişikliği pasif bırakılmıştır.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Security Notice */}
            <section className="rounded-3xl border border-gold/20 bg-gold/5 p-7 flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Güvenlik Protokolü</h4>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                  CRM üzerindeki oturumunuz Supabase Auth protokolü ile korunmaktadır. Mevcut politikanız gereği parola değişikliği paneli üzerinden yapılamaz. Şifre sıfırlama veya değişiklik talepleri için sistem yöneticinizle iletişime geçin.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
