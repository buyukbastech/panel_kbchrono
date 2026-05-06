import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function UserMenu() {
  const [userName, setUserName] = useState("Yönetici");
  const [userInitials, setUserInitials] = useState("AD");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const email = session.user.email.toLowerCase();
        if (email === "buyukbastech@gmail.com") {
          setUserName("Ahmet Enes Büyükbaş");
          setUserInitials("AE");
        } else if (email === "korayunalan97@gmail.com") {
          setUserName("Koray Ünal");
          setUserInitials("KÜ");
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="ml-1 flex items-center gap-2.5 rounded-lg pl-1 pr-3 py-1 hover:bg-surface/40 transition-colors cursor-pointer group animate-in fade-in zoom-in-95 duration-300">
      <div className="h-8 w-8 rounded-lg bg-gradient-gold flex items-center justify-center text-[11px] font-bold tracking-wider text-primary-foreground shadow-sm group-hover:shadow-gold-glow-soft transition-all">
        {userInitials}
      </div>
      <div className="hidden md:block leading-tight pt-0.5">
        <p className="text-[13px] font-medium text-foreground tracking-tight">{userName}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5" style={{ fontSize: '9px' }}>Atölye Yöneticisi</p>
      </div>
    </div>
  );
}
