import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Rocket, RefreshCw, X, Loader2 } from "lucide-react";

import { useEffect, useState } from "react";
import {
  deleteProductServerFn,
  getProductsServerFn,
  updateProductStatusServerFn,
} from "@/lib/products-server";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { ProductForm } from "./ProductForm";

// ─── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    taslak:  { label: "TASLAK",  cls: "border-gold/30 bg-gold-muted text-gold" },
    arsiv:   { label: "ARŞİV",   cls: "border-white/20 bg-white/5 text-muted-foreground" },
    yayinda: { label: "YAYINDA", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  };
  const { label, cls } = map[status] ?? map.taslak;
  return (
    <Badge variant="outline" className={`text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 ${cls}`}>
      {label}
    </Badge>
  );
}

// ─── Action buttons helper ────────────────────────────────────────────────────
function ActionButtons({
  product,
  view,
  onEdit,
  onStatusUpdate,
  onDelete,
  compact = false,
}: {
  product: any;
  view: "products" | "archive";
  onEdit: () => void;
  onStatusUpdate: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const btnBase = compact
    ? "h-9 w-9 flex items-center justify-center rounded-xl transition-colors"
    : "h-8 w-8 flex items-center justify-center rounded-lg transition-colors";

  return (
    <div className="flex items-center gap-1.5">
      {/* Edit */}
      <button
        onClick={onEdit}
        className={`${btnBase} bg-surface-elevated/60 hover:bg-gold/15 text-muted-foreground hover:text-gold border border-border/40 hover:border-gold/30`}
        title="Düzenle"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </button>

      {view === "products" ? (
        <>
          {product.status === "taslak" && (
            <button
              onClick={() => onStatusUpdate(product.id, "yayinda")}
              className={`${btnBase} bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 px-2.5 gap-1.5 w-auto`}
              title="Yayınla"
            >
              <Rocket className="h-3.5 w-3.5" />
              {compact && <span className="text-[11px] font-semibold">Yayınla</span>}
            </button>
          )}
          <button
            onClick={() => onStatusUpdate(product.id, "arsiv")}
            className={`${btnBase} bg-surface-elevated/60 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 border border-border/40 hover:border-amber-500/20`}
            title="Arşivle"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onStatusUpdate(product.id, "yayinda")}
            className={`${btnBase} bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20`}
            title="Yayına Al"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className={`${btnBase} bg-surface-elevated/60 hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border/40 hover:border-destructive/20`}
            title="Kalıcı Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Mobile product card ──────────────────────────────────────────────────────
function ProductCard({
  product,
  view,
  onEdit,
  onStatusUpdate,
  onDelete,
}: {
  product: any;
  view: "products" | "archive";
  onEdit: () => void;
  onStatusUpdate: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-border/40 last:border-0 hover:bg-surface/40 transition-colors">
      {/* Image - Transparan & Havada Süzülen Efekt */}
      <div className="h-14 w-14 rounded-xl border border-gold/20 overflow-hidden bg-transparent shrink-0 flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500">
        <div className="absolute inset-0 bg-gold/5 blur-xl rounded-full opacity-50" />
        <img
          src={product.image || "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&q=80&w=100&h=100"}
          alt={product.name}
          className="h-[120%] w-[120%] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
          style={{ imageRendering: "auto", filter: "contrast(1.05) saturate(1.05)" }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground tracking-tight truncate">{product.name}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{product.sku}</p>
          </div>
          <StatusBadge status={product.status} />
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <div>
            <p className="text-[11px] text-muted-foreground/70">{product.collection}</p>
            <p className="text-[13px] font-semibold text-foreground mt-0.5">
              {product.price ? (() => {
                const clean = product.price.replace(/[₺$\s.]/g, '');
                const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                return `$ ${formatted}`;
              })() : ''}
            </p>
          </div>
          <ActionButtons
            product={product}
            view={view}
            onEdit={onEdit}
            onStatusUpdate={onStatusUpdate}
            onDelete={onDelete}
            compact
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ProductList({
  view = "products",
  refreshTrigger = 0,
  onRefresh,
}: {
  view?: "products" | "archive";
  refreshTrigger?: number;
  onRefresh?: () => void;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchProducts = async () => {
    try {
      const result = await getProductsServerFn();
      if (result.success && result.data) {
        const allData = Array.isArray(result.data) ? result.data : [];
        setProducts(
          view === "archive"
            ? allData.filter((p: any) => p.status === "arsiv")
            : allData.filter((p: any) => p.status !== "arsiv")
        );
      } else {
        toast.error("Ürünler yüklenemedi: " + result.error);
      }
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [view, refreshTrigger]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const result = await updateProductStatusServerFn({ data: { id, status: newStatus } });
      if (result.success) {
        toast.success(newStatus === "arsiv" ? "Ürün arşivlendi." : "Ürün yayına alındı.");
        fetchProducts();
        onRefresh?.();
      } else {
        toast.error("Hata: " + result.error);
      }
    } catch (err: any) {
      toast.error("İşlem başarısız: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu ürünü kalıcı olarak silmek istediğinizden emin misiniz?")) return;
    try {
      const result = await deleteProductServerFn({ data: { id } });
      if (result.success) {
        toast.success("Ürün kalıcı olarak silindi.");
        fetchProducts();
        onRefresh?.();
      } else {
        toast.error("Hata: " + result.error);
      }
    } catch (err: any) {
      toast.error("Silme işlemi başarısız: " + err.message);
    }
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 rounded-2xl border border-border bg-surface/40 backdrop-blur-md">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground animate-pulse">Ürünler yükleniyor...</p>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3 rounded-2xl border border-border bg-surface/40 backdrop-blur-md text-muted-foreground">
        <p className="text-sm">Henüz ürün eklenmemiş.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-hidden animate-fade-up">

      {/* ── MOBILE: card list (hidden on lg+) ────────────────────────────────── */}
      <div className="lg:hidden divide-y divide-border/40">
        {products.map((product: any) => (
          <ProductCard
            key={product.id}
            product={product}
            view={view}
            onEdit={() => openEdit(product)}
            onStatusUpdate={handleStatusUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* ── DESKTOP: table (hidden on mobile) ────────────────────────────────── */}
      <div className="hidden lg:block overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-surface-elevated/50">
            <TableRow className="hover:bg-transparent border-border/60">
              <TableHead className="w-[80px] text-[10px] uppercase tracking-widest text-muted-foreground font-bold pl-6">Görsel</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Ürün Adı & SKU</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Açıklama</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Koleksiyon</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Durum</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Fiyat</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-right pr-6">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product: any) => (
              <TableRow key={product.id} className="group hover:bg-surface/60 border-border/40 transition-colors">
                <TableCell className="py-4 pl-6">
                  {/* Image - Transparan & Havada Süzülen Efekt */}
                  <div className="h-14 w-14 rounded-xl border border-gold/20 overflow-hidden bg-transparent flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500">
                    <div className="absolute inset-0 bg-gold/5 blur-xl rounded-full opacity-50" />
                    <img
                      src={product.image || "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&q=80&w=100&h=100"}
                      alt={product.name}
                      className="h-[120%] w-[120%] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
                      style={{ imageRendering: "auto", filter: "contrast(1.05) saturate(1.05)" }}
                    />
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-foreground tracking-tight">{product.name}</span>
                    <span className="text-[11px] font-mono text-muted-foreground mt-0.5">{product.sku}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4 truncate max-w-[200px]">
                  <p className="text-[12px] text-muted-foreground/80 line-clamp-1 italic">{product.description}</p>
                </TableCell>
                <TableCell className="py-4 text-[13px] text-muted-foreground">{product.collection}</TableCell>
                <TableCell className="py-4"><StatusBadge status={product.status} /></TableCell>
                <TableCell className="py-4 text-[13px] font-medium text-foreground">
                  {product.price ? (() => {
                    const clean = product.price.replace(/[₺$\s.]/g, '');
                    const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    return `$ ${formatted}`;
                  })() : ''}
                </TableCell>
                <TableCell className="py-4 text-right pr-6">
                  {/* Desktop: show on hover */}
                  <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButtons
                      product={product}
                      view={view}
                      onEdit={() => openEdit(product)}
                      onStatusUpdate={handleStatusUpdate}
                      onDelete={handleDelete}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-surface-elevated/20 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground font-medium tracking-wide">
          <span className="text-gold font-bold">{products.length}</span> ürün gösteriliyor
        </p>
        <div className="flex items-center gap-1.5">
          <button className="px-3 py-1.5 rounded-lg border border-border bg-surface-elevated/50 text-[11px] font-medium text-muted-foreground hover:text-gold hover:border-gold/30 transition-all disabled:opacity-50">
            Önceki
          </button>
          <button className="h-7 w-7 flex items-center justify-center rounded-lg bg-gradient-gold text-[11px] font-bold text-primary-foreground shadow-gold-glow">
            1
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-border bg-surface-elevated/50 text-[11px] font-medium text-muted-foreground hover:text-gold hover:border-gold/30 transition-all disabled:opacity-50">
            Sonraki
          </button>
        </div>
      </div>

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none focus:outline-none [&>button:last-child]:hidden">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-3xl glass-strong border border-border/40 custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-20 p-4 sm:p-6 bg-surface/80 backdrop-blur-xl border-b border-border/40 flex items-center justify-between">
              <div>
                <DialogTitle className="font-display text-xl sm:text-2xl font-semibold">Ürünü Düzenle</DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1 text-[13px]">
                  {editingProduct?.name} ürününün bilgilerini güncelleyin.
                </DialogDescription>
              </div>
              <DialogClose className="h-9 w-9 flex items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-gold hover:bg-gold hover:text-primary-foreground transition-all shadow-gold-glow-soft">
                <X className="h-5 w-5" strokeWidth={2.5} />
              </DialogClose>
            </div>
            <div className="p-4 sm:p-8">
              <ProductForm
                key={editingProduct?.id}
                initialData={editingProduct}
                onSuccess={() => {
                  setIsEditModalOpen(false);
                  fetchProducts();
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
