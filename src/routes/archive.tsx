import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bell, Search, Settings, Share2, MoreHorizontal, Archive, FileSpreadsheet, FileText } from "lucide-react";
import { Sidebar, MobileNav } from "@/components/admin/Sidebar";
import { ProductList } from "@/components/admin/ProductList";
import { UserMenu } from "@/components/admin/UserMenu";
import { supabase } from "@/lib/supabase";
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
import { requireAuth, useInactivityLogout } from "@/lib/auth-guard";

export const Route = createFileRoute("/archive")({
  beforeLoad: requireAuth,
  component: ArchivePage,
});

function ArchivePage() {
  useInactivityLogout();
  const [totalCount, setTotalCount] = useState(0);

  const [isExporting, setIsExporting] = useState(false);

  const fetchCount = async () => {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'arsiv');
    setTotalCount(count || 0);
  };

  useEffect(() => {
    fetchCount();
  }, []);

  const handleExportXLSX = async () => {
    setIsExporting(true);
    try {
      const result = await getProductsServerFn();
      if (!result.success || !result.data) throw new Error(result.error);
      
      const data = result.data
        .filter((p: any) => p.status === 'arsiv')
        .map((p: any) => ({
          "Ürün Adı": p.name,
          "SKU": p.sku,
          "Koleksiyon": p.collection,
          "Fiyat": p.price,
          "Açıklama": p.description,
          "Mekanizma": p.movement,
          "Kasa": p.case_material,
          "Boyut": p.case_size,
          "Su Rezistansı": p.water_resistance,
          "Güç Rezervi": p.power_reserve,
          "Cam": p.crystal
        }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Arşivlenen Ürünler");
      XLSX.writeFile(workbook, "kbchrono_Arsiv_Listesi.xlsx");
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
      doc.text("kbchrono Arşivlenen Ürün Listesi", 14, 15);
      
      const tableData = result.data
        .filter((p: any) => p.status === 'arsiv')
        .map((p: any) => [
          p.name,
          p.sku,
          p.collection,
          p.price
        ]);

      autoTable(doc, {
        head: [['Ürün Adı', 'SKU', 'Koleksiyon', 'Fiyat']],
        body: tableData,
        startY: 20,
        theme: 'striped',
        styles: { fontSize: 8 }
      });

      doc.save("kbchrono_Arsiv_Listesi.pdf");
      toast.success("PDF dosyası indirildi.");
    } catch (error: any) {
      toast.error("PDF dışa aktarma hatası: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

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
                <input placeholder="Arşivde ara…" className="bg-transparent w-full outline-none placeholder:text-muted-foreground text-foreground text-[13px]" />
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shrink-0">
                <Archive className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                  Arşiv
                </h1>
                <p className="mt-1.5 text-muted-foreground text-[13px]">
                  Toplam {totalCount} arşivlenmiş ürün bulunuyor.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/40 text-muted-foreground hover:text-gold hover:border-gold/40 transition-all">
                <Share2 className="h-4 w-4" strokeWidth={2} />
              </button>
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
            </div>
          </div>

          {/* Product List In Archive View */}
          <ProductList view="archive" onRefresh={fetchCount} />
        </div>
      </main>
    </div>
  );
}
