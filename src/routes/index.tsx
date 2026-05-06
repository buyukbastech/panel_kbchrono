import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Bell, Settings, TrendingUp, TrendingDown, Watch, Rocket, FileText, Archive } from "lucide-react";
import { Sidebar, MobileNav } from "@/components/admin/Sidebar";
import { UserMenu } from "@/components/admin/UserMenu";
import { supabase } from "@/lib/supabase";
import { requireAuth, useInactivityLogout } from "@/lib/auth-guard";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

export const Route = createFileRoute("/")({
  beforeLoad: requireAuth,
  component: DashboardOverview,
});

function DashboardOverview() {
  useInactivityLogout();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    archive: 0,
    topProducts: [] as any[],
    chartData: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*');

        if (data) {
          const total = data.length;
          const active = data.filter(p => p.status === 'yayinda').length;
          const draft = data.filter(p => p.status === 'taslak').length;
          const archive = data.filter(p => p.status === 'arsiv').length;
          
          // Get top 5 most viewed
          const topProducts = [...data]
            .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
            .slice(0, 5);

          // Pie chart data
          const chartData = [
            { name: 'Yayında', value: active, color: '#10b981' },
            { name: 'Taslak', value: draft, color: '#fbbf24' },
            { name: 'Arşiv', value: archive, color: '#94a3b8' },
          ].filter(item => item.value > 0);

          setStats({ total, active, draft, archive, topProducts, chartData });
        }
      } catch (err) {
        console.error("Stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
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
                <input placeholder="Ara…" className="bg-transparent w-full outline-none placeholder:text-muted-foreground text-foreground text-[13px]" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserMenu />
            </div>
          </div>

          <div className="px-6 lg:px-8 pt-6 pb-8 animate-fade-up">
            <div className="mb-8">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                Genel Bakış
              </h1>
              <p className="mt-2 text-muted-foreground max-w-2xl">
                Atölyenizin güncel durumu ve dinamik verileri.
              </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Toplam Ürün", value: stats.total, icon: Watch, color: "text-gold", bg: "bg-gold/10" },
                { label: "Aktif İlanlar", value: stats.active, icon: Rocket, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                { label: "Taslaklar", value: stats.draft, icon: FileText, color: "text-amber-400", bg: "bg-amber-400/10" },
                { label: "Arşiv", value: stats.archive, icon: Archive, color: "text-muted-foreground", bg: "bg-white/5" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-surface/40 px-6 py-5 hover:border-gold/30 transition-all hover-lift">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${s.bg}`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">GÜNCEL</span>
                  </div>
                  <p className="text-3xl font-display font-bold text-foreground">
                    {loading ? "..." : s.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="px-6 py-8 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-3xl glass-strong border border-border p-8 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground">Popüler Ürünler</h3>
                  <p className="text-sm text-muted-foreground mt-1">En çok incelenen saatler ve performansları.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold text-[10px] uppercase tracking-wider font-bold">
                  CANLI TAKİP
                </div>
              </div>
              
              <div className="space-y-6">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-14 w-14 rounded-xl bg-surface-elevated" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-surface-elevated rounded" />
                        <div className="h-3 w-1/4 bg-surface-elevated/50 rounded" />
                      </div>
                    </div>
                  ))
                ) : stats.topProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <Watch className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm">Henüz veri bulunamadı.</p>
                  </div>
                ) : (
                  stats.topProducts.map((p: any, idx: number) => (
                    <div key={p.id} className="flex items-center gap-5 group hover:bg-surface/30 p-2 -m-2 rounded-2xl transition-all">
                      <div className="relative h-16 w-16 rounded-xl border border-border overflow-hidden bg-surface-elevated shrink-0">
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute top-1 left-1 h-5 w-5 rounded-md bg-gold/90 text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                          #{idx + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[15px] font-semibold text-foreground truncate">{p.name}</h4>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{p.collection}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2 text-gold">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-lg font-display font-bold tracking-tight">{p.views_count || 0}</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Toplam İzlenme</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <button className="mt-8 pt-6 border-t border-border/40 text-sm text-gold font-medium hover:text-gold-light transition-colors flex items-center gap-2">
                Tüm Verileri Görüntüle <TrendingUp className="h-4 w-4" />
              </button>

              <div className="mt-10 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topProducts}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      hide={true}
                    />
                    <YAxis hide={true} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ 
                        backgroundColor: 'rgba(23, 23, 23, 0.95)', 
                        border: '1px solid rgba(193, 155, 78, 0.2)',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                    />
                    <Bar 
                      dataKey="views_count" 
                      fill="url(#goldGradient)" 
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                    />
                    <defs>
                      <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C19B4E" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#8A6E35" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl glass-strong p-6 border border-border flex flex-col min-h-[400px]">
              <h3 className="font-display font-semibold mb-6 flex items-center gap-2">
                <Rocket className="h-4 w-4 text-emerald-400" />
                Ürün Dağılımı
              </h3>
              
              <div className="flex-1 w-full min-h-[250px]">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center animate-pulse">
                    <div className="h-40 w-40 rounded-full border-8 border-surface-elevated" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(23, 23, 23, 0.95)', 
                          border: '1px solid rgba(193, 155, 78, 0.2)',
                          borderRadius: '12px',
                          color: '#fff'
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {stats.chartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{item.value} Ürün</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
