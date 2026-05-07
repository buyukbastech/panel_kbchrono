import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);

  const allowedEmails = ["buyukbastech@gmail.com", "korayunalan97@gmail.com"];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!allowedEmails.includes(email.toLowerCase())) {
      setShowUnauthorizedModal(true);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        toast.error(`Giriş başarısız: ${error?.message || "Bilinmeyen hata"}`);
        setIsLoading(false);
        return;
      }

      // Başarılı giriş
      sessionStorage.setItem("isAdminAuth", "true");
      sessionStorage.setItem("crm_pass", password); // Ayarlar menüsünde görünebilmesi için kaydediyoruz
      toast.success("Giriş başarılı! Yönetim paneline yönlendiriliyorsunuz.");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(`Sunucu hatası: ${err?.message || "Bağlantı kurulamadı."}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background text-foreground overflow-hidden">
      {/* Unauthorized Alert Modal */}
      {showUnauthorizedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[24px] border border-border/50 bg-background p-6 shadow-2xl shadow-rose-500/10 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowUnauthorizedModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-surface/50 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 mb-6">
              <AlertCircle className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <h3 className="text-center font-display text-xl font-semibold text-foreground mb-2">
              Yetkisiz Erişim!
            </h3>
            <p className="text-center text-[13px] text-muted-foreground mb-8 px-2 font-medium">
              Bu e-posta adresi ile CRM Paneline giriş için yetkiniz bulunmamaktadır. Sadece yetkili yöneticiler erişim sağlayabilir.
            </p>
            <button
              onClick={() => setShowUnauthorizedModal(false)}
              className="w-full flex items-center justify-center rounded-xl bg-foreground text-background font-semibold py-3 transition-colors hover:bg-foreground/90 hover:shadow-md"
            >
              Anladım
            </button>
          </div>
        </div>
      )}

      {/* Ambient backgrounds */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gold/15 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-gold/10 blur-[120px]" />

      <div className="relative w-full max-w-md px-6 py-12 animate-fade-up">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="h-16 w-16 bg-gradient-gold rounded-2xl flex items-center justify-center shadow-2xl shadow-gold/20 mb-6">
            <ShieldCheck className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            kbchrono Yönetim Paneli
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lütfen devam etmek için bilgilerinizi girin.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="relative rounded-3xl border border-border/50 bg-surface/50 backdrop-blur-xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                E-Posta
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground/70" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kunkor.com"
                  required
                  className="w-full bg-background/50 border border-border/50 rounded-xl py-3 pl-10 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                Parola
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground/70" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-background/50 border border-border/50 rounded-xl py-3 pl-10 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full group relative flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3.5 font-medium transition-all hover:bg-foreground/90 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-8"
            >
              <div className="absolute inset-0 bg-gradient-gold opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center gap-2 font-semibold">
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <>
                    Giriş Yap
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            © 2026 kbchrono. Tüm hakları gizlidir.
          </p>
        </div>
      </div>
    </div>
  );
}
