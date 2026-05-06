import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bell, Search, Plus, Watch, Settings, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { Sidebar, MobileNav } from "@/components/admin/Sidebar";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductList } from "@/components/admin/ProductList";
import { UserMenu } from "@/components/admin/UserMenu";
import { supabase } from "@/lib/supabase";
import { requireAuth, useInactivityLogout } from "@/lib/auth-guard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { X, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProductsServerFn } from "@/lib/products-server";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  beforeLoad: requireAuth,
  component: ProductsPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      new: (search.new as string) === "true",
    };
  },
});

function ProductsPage() {
  useInactivityLogout();
  const { new: isNewFromUrl } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const fetchCount = async () => {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    setTotalCount(count || 0);
  };

  useEffect(() => {
    fetchCount();
  }, [refreshTrigger]);

  const handleExportXLSX = async () => {
    setIsExporting(true);
    try {
      const result = await getProductsServerFn();
      if (!result.success || !result.data) throw new Error(result.error);
      
      const data = result.data.map((p: any) => ({
        "Ürün Adı": p.name,
        "SKU": p.sku,
        "Koleksiyon": p.collection,
        "Fiyat": p.price,
        "Açıklama": p.description,
        "Durum": p.status,
        "Mekanizma": p.movement,
        "Kasa": p.case_material,
        "Boyut": p.case_size,
        "Su Rezistansı": p.water_resistance,
        "Güç Rezervi": p.power_reserve,
        "Cam": p.crystal
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");
      XLSX.writeFile(workbook, "kbchrono_Urun_Listesi.xlsx");
      toast.success("Excel dosyası indirildi.");
    } catch (error: any) {
      toast.error("Excel dışa aktarma hatası: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const result = await getProductsServerFn();
      if (!result.success || !result.data) throw new Error(result.error);

      const doc = new jsPDF();
      doc.text("kbchrono Ürün Listesi", 14, 15);
      
      const tableData = result.data.map((p: any) => [
        p.name,
        p.sku,
        p.collection,
        p.price,
        p.status
      ]);

      autoTable(doc, {
        head: [['Ürün Adı', 'SKU', 'Koleksiyon', 'Fiyat', 'Durum']],
        body: tableData,
        startY: 20,
        theme: 'striped',
        styles: { fontSize: 8 }
      });

      doc.save("kbchrono_Urun_Listesi.pdf");
      toast.success("PDF dosyası indirildi.");
    } catch (error: any) {
      toast.error("PDF dışa aktarma hatası: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (isNewFromUrl) {
      setIsModalOpen(true);
      navigate({ search: (prev) => ({ ...prev, new: false }), replace: true });
    }
  }, [isNewFromUrl, navigate]);

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
        </header>

        <div className="px-6 lg:px-8 py-8 animate-fade-up">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold-soft border border-gold/20 shrink-0">
                <Watch className="h-6 w-6 text-gold" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                  Ürün Listesi
                </h1>
                <p className="mt-1.5 text-muted-foreground text-[13px]">
                  Toplam {totalCount} saat koleksiyonu yönetiliyor.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/40 text-muted-foreground hover:text-gold hover:border-gold/40 transition-all">
                    <Share2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-surface-elevated/95 backdrop-blur-xl border-border/40 text-foreground">
                  <DropdownMenuItem
                    onClick={() => {
                      const url = "https://kunbrands.com/collections";
                      const message = `🕐 kbchrono Saat Koleksiyonu\nTüm ürünleri görüntülemek için: ${url}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
                    }}
                    className="flex items-center gap-2 py-2.5 cursor-pointer focus:bg-emerald-500/10 focus:text-emerald-400"
                  >
                    <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>WhatsApp'ta Paylaş</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/40 text-muted-foreground hover:text-gold hover:border-gold/40 transition-all">
                    <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-surface-elevated/95 backdrop-blur-xl border-border/40 text-foreground">
                  <DropdownMenuItem 
                    onClick={handleExportXLSX}
                    disabled={isExporting}
                    className="flex items-center gap-2 py-2.5 cursor-pointer focus:bg-gold/10 focus:text-gold"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel (.xlsx) Aktar</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 py-2.5 cursor-pointer focus:bg-gold/10 focus:text-gold"
                  >
                    <FileText className="h-4 w-4" />
                    <span>PDF Olarak Aktar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="ml-2 inline-flex items-center gap-2.5 rounded-xl bg-gradient-gold px-5 py-2.5 text-[14px] font-semibold tracking-tight text-primary-foreground shadow-gold-glow hover:-translate-y-0.5 transition-all"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} /> Yeni Ürün
              </button>
            </div>
          </div>

          {/* Product List */}
          <ProductList refreshTrigger={refreshTrigger} onRefresh={fetchCount} />
        </div>



        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none focus:outline-none [&>button:last-child]:hidden">
            <div className="w-full max-h-[90vh] overflow-y-auto rounded-3xl glass-strong border border-border/40 custom-scrollbar animate-in zoom-in-95 duration-200">
              <div className="sticky top-0 z-20 p-6 bg-surface/80 backdrop-blur-xl border-b border-border/40 flex items-center justify-between">
                <div>
                  <DialogTitle className="font-display text-2xl font-semibold">Yeni Ürün Ekle</DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-1 text-[13px]">
                    Atölyeye yeni bir parça eklemek için aşağıdaki formu doldurun.
                  </DialogDescription>
                </div>
                <DialogClose className="h-9 w-9 flex items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-gold hover:bg-gold hover:text-primary-foreground transition-all shadow-gold-glow-soft">
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </DialogClose>
              </div>
              <div className="p-8">
                <ProductForm 
                  onSuccess={() => {
                    setIsModalOpen(false);
                    setRefreshTrigger(prev => prev + 1);
                  }} 
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
