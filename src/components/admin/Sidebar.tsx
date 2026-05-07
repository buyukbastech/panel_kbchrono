import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Watch,
  Settings,
  LogOut,
  Plus,
  Archive,
  Menu
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  to?: string;
  onClick?: () => void;
  badge?: string | null;
  hasAction?: boolean;
};

type NavGroup = { title: string; items: NavItem[] };

function SidebarContent({ archiveCount, onItemClick }: { archiveCount: number | null, onItemClick?: () => void }) {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("crm_pass");
    window.location.href = "/login";
  };

  const groups: NavGroup[] = [
    {
      title: "Atölye",
      items: [
        { icon: LayoutDashboard, label: "Genel Bakış", to: "/" },
        { icon: Watch, label: "Ürünler", to: "/products", hasAction: true },
        { icon: Archive, label: "Arşiv", to: "/archive", badge: archiveCount?.toString() },
      ],
    },
    {
      title: "Sistem",
      items: [
        { icon: Settings, label: "Ayarlar", to: "/settings" },
        { icon: LogOut, label: "Çıkış Yap", onClick: handleLogout },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold shadow-gold-glow">
            <Watch className="h-4 w-4 text-primary-foreground" strokeWidth={2.25} />
          </div>
          <p className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            kbchrono
          </p>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 overflow-y-auto pb-4">
        {groups.map((group, gi) => (
          <div key={group.title} className={gi === 0 ? "" : "mt-5"}>
            <p className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 font-medium">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <div
                    key={item.label}
                    className={`group relative flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-gold-soft text-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground hover-lift"
                    }`}
                  >
                    {item.to ? (
                      <Link
                        to={item.to}
                        onClick={onItemClick}
                        className="flex items-center gap-3 flex-1 overflow-hidden"
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-gradient-gold" />
                        )}
                        <item.icon
                          className={`h-[16px] w-[16px] transition-colors shrink-0 ${
                            isActive
                              ? "text-gold"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                          strokeWidth={1.75}
                        />
                        <span className="flex-1 tracking-tight truncate">{item.label}</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          item.onClick?.();
                          onItemClick?.();
                        }}
                        className="flex items-center gap-3 flex-1 overflow-hidden text-left"
                      >
                        <item.icon
                          className="h-[16px] w-[16px] transition-colors shrink-0 text-muted-foreground group-hover:text-foreground"
                          strokeWidth={1.75}
                        />
                        <span className="flex-1 tracking-tight truncate">{item.label}</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5 ml-1">
                      {item.badge && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            isActive
                              ? "bg-gold/25 text-gold"
                              : "bg-gradient-gold text-primary-foreground"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.hasAction && (
                        <Link
                          to="/products"
                          search={{ new: true }}
                          onClick={onItemClick}
                          className="flex h-5 w-5 items-center justify-center rounded-md bg-gold text-primary-foreground hover:scale-110 active:scale-95 transition-all shadow-gold-glow opacity-0 group-hover:opacity-100"
                          title="Yeni Ürün Ekle"
                        >
                          <Plus className="h-3 w-3" strokeWidth={3} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const [archiveCount, setArchiveCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchArchiveCount() {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'arsiv');
      setArchiveCount(count || null);
    }
    fetchArchiveCount();

    const interval = setInterval(fetchArchiveCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-border bg-sidebar/80 backdrop-blur-xl">
      <SidebarContent archiveCount={archiveCount} />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [archiveCount, setArchiveCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchArchiveCount() {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'arsiv');
      setArchiveCount(count || null);
    }
    fetchArchiveCount();
  }, []);

  return (
    <div className="lg:hidden flex items-center">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/40 text-muted-foreground hover:text-gold hover:border-gold/40 transition-all">
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 bg-sidebar/95 backdrop-blur-2xl border-r border-border/40 w-[260px]">
          <SidebarContent archiveCount={archiveCount} onItemClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
