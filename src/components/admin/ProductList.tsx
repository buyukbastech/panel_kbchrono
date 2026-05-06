import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Edit2, Trash2, Eye, Rocket } from "lucide-react";

import { useEffect, useState } from "react";
import { Loader2, Archive, RefreshCw, X } from "lucide-react";
import { deleteProductServerFn, getProductsServerFn, updateProductStatusServerFn } from "@/lib/products-server";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { ProductForm } from "./ProductForm";

export function ProductList({ 
  view = 'products', 
  refreshTrigger = 0,
  onRefresh
}: { 
  view?: 'products' | 'archive',
  refreshTrigger?: number,
  onRefresh?: () => void
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
        if (view === 'archive') {
          setProducts(allData.filter((p: any) => p.status === 'arsiv'));
        } else {
          setProducts(allData.filter((p: any) => p.status !== 'arsiv'));
        }
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
        toast.success(newStatus === 'arsiv' ? "Ürün arşivlendi." : "Ürün yayına alındı.");
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 rounded-2xl border border-border bg-surface/40 backdrop-blur-md">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground animate-pulse">Ürünler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-md overflow-hidden animate-fade-up">
      <div className="overflow-x-auto custom-scrollbar">
        <Table>
        <TableHeader className="bg-surface-elevated/50">
          <TableRow className="hover:bg-transparent border-border/60">
            <TableHead className="w-[80px] text-[10px] uppercase tracking-widest text-muted-foreground font-bold pl-6">
              Görsel
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Ürün Adı & SKU
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Açıklama
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Koleksiyon
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Durum
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Fiyat
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-right pr-6">
              İşlemler
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                Henüz ürün eklenmemiş.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product: any) => (
              <TableRow key={product.id} className="group hover:bg-surface/60 border-border/40 transition-colors">
                <TableCell className="py-4 pl-6">
                  <div className="h-12 w-12 rounded-xl border border-gold/20 overflow-hidden bg-surface-elevated">
                    <img 
                      src={product.image || "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&q=80&w=100&h=100"} 
                      alt={product.name} 
                      className="h-full w-full object-cover" 
                    />
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-foreground tracking-tight">
                      {product.name}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      {product.sku}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4 truncate max-w-[200px]">
                  <p className="text-[12px] text-muted-foreground/80 line-clamp-1 italic">
                    {product.description}
                  </p>
                </TableCell>
                <TableCell className="py-4 text-[13px] text-muted-foreground">
                  {product.collection}
                </TableCell>
                <TableCell className="py-4">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 ${
                      product.status === 'taslak' 
                        ? 'border-gold/30 bg-gold-muted text-gold' 
                        : product.status === 'arsiv'
                        ? 'border-white/20 bg-white/5 text-muted-foreground'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {product.status === 'taslak' ? 'TASLAK' : product.status === 'arsiv' ? 'ARŞİV' : 'YAYINDA'}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 text-[13px] font-medium text-foreground">
                  {product.price}
                </TableCell>
                <TableCell className="py-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingProduct(product);
                        setIsEditModalOpen(true);
                      }}
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface-elevated text-muted-foreground hover:text-gold transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    
                    {view === 'products' ? (
                      <>
                        {/* Taslak ürünler için Yayına Al butonu */}
                        {product.status === 'taslak' && (
                          <button
                            onClick={() => handleStatusUpdate(product.id, 'yayinda')}
                            className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors text-[11px] font-semibold border border-emerald-500/20"
                            title="Yayınla"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                            Yayınla
                          </button>
                        )}
                        <button 
                          onClick={() => handleStatusUpdate(product.id, 'arsiv')}
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Arşivle"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(product.id, 'yayinda')}
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors"
                          title="Yayına Al"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Kalıcı Olarak Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}

                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
      
      {/* Table Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-surface-elevated/20 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground font-medium tracking-wide">
          <span className="text-gold font-bold">{products.length}</span> üründen <span className="text-foreground">{products.length}</span>'ü gösteriliyor
        </p>
        <div className="flex items-center gap-1.5">
          <button className="px-3 py-1.5 rounded-lg border border-border bg-surface-elevated/50 text-[11px] font-medium text-muted-foreground hover:text-gold hover:border-gold/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            Önceki
          </button>
          <div className="flex items-center gap-1">
            <button className="h-7 w-7 flex items-center justify-center rounded-lg bg-gradient-gold text-[11px] font-bold text-primary-foreground shadow-gold-glow">
              1
            </button>
          </div>
          <button className="px-3 py-1.5 rounded-lg border border-border bg-surface-elevated/50 text-[11px] font-medium text-muted-foreground hover:text-gold hover:border-gold/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            Sonraki
          </button>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none focus:outline-none [&>button:last-child]:hidden">
          <div className="w-full max-h-[90vh] overflow-y-auto rounded-3xl glass-strong border border-border/40 custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-20 p-6 bg-surface/80 backdrop-blur-xl border-b border-border/40 flex items-center justify-between">
              <div>
                <DialogTitle className="font-display text-2xl font-semibold">Ürünü Düzenle</DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1 text-[13px]">
                  {editingProduct?.name} ürününün bilgilerini güncelleyin.
                </DialogDescription>
              </div>
              <DialogClose className="h-9 w-9 flex items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-gold hover:bg-gold hover:text-primary-foreground transition-all shadow-gold-glow-soft">
                <X className="h-5 w-5" strokeWidth={2.5} />
              </DialogClose>
            </div>
            <div className="p-8">
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
