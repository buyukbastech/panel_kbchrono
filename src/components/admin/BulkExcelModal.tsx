import { useState, useRef } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  Copy,
  Check,
  Download,
  ImagePlus,
  Loader2,
  X,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  Wand2,
  Link2,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { uploadProductImage } from "@/lib/storage";
import { processImageWithAIVision } from "@/lib/ai-vision";
import {
  getProductsServerFn,
  createProductServerFn,
  updateProductServerFn,
} from "@/lib/products-server";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

export interface ParsedExcelRow {
  rowIndex: number;
  name: string;
  sku: string;
  collection: string;
  price: string;
  description: string;
  status: string;
  movement: string;
  case_material: string;
  case_size: string;
  water_resistance: string;
  power_reserve: string;
  crystal: string;
  images: string[];
  existingId?: string;
  existingImages?: string[];
}

interface BulkExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function parseImagesCell(raw: unknown): string[] {
  if (!raw) return [];
  const str = String(raw).trim();
  if (!str) return [];
  return Array.from(
    new Set(
      str
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && (s.startsWith("http://") || s.startsWith("https://")))
    )
  ).slice(0, 10);
}

function normalizePrice(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  const str = String(raw).trim();
  if (!str) return "";
  const digits = str.replace(/[^0-9]/g, "");
  if (!digits) return str;
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$${formatted}`;
}

function normalizeStatus(raw: unknown): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (s === "yayinda" || s === "yayında" || s === "published" || s === "active") {
    return "yayinda";
  }
  if (s === "arsiv" || s === "arşiv" || s === "archive" || s === "archived") {
    return "arsiv";
  }
  if (s === "taslak" || s === "draft") {
    return "taslak";
  }
  return "yayinda";
}

export function BulkExcelModal({
  open,
  onOpenChange,
  onSuccess,
}: BulkExcelModalProps) {
  // ── 1. Multi-image uploader & URL generator state ──────────────────────────
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [useAiForFirstImage, setUseAiForFirstImage] = useState(false);
  const [copiedUrls, setCopiedUrls] = useState(false);
  const imageHelperInputRef = useRef<HTMLInputElement>(null);

  // ── 2. Excel parsing & preview state ───────────────────────────────────────
  const [rows, setRows] = useState<ParsedExcelRow[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>("");
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [uploadingRowIndex, setUploadingRowIndex] = useState<number | null>(null);
  const [editingUrlRowIndex, setEditingUrlRowIndex] = useState<number | null>(null);
  const [editingUrlValue, setEditingUrlValue] = useState<string>("");

  const excelInputRef = useRef<HTMLInputElement>(null);
  const rowImageInputRef = useRef<HTMLInputElement>(null);
  const activeRowForUploadRef = useRef<number | null>(null);

  // ── Handle standalone multi-image upload for Excel URL generation ──────────
  const handleHelperImageUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 10);

    if (imageFiles.length === 0) {
      toast.error("Lütfen geçerli resim dosyaları (PNG, JPG, WEBP) seçin.");
      return;
    }

    setIsUploadingImages(true);
    try {
      toast.info(`${imageFiles.length} görsel buluta yükleniyor...`);
      const urls: string[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        let fileToUpload = imageFiles[i];
        if (i === 0 && useAiForFirstImage && uploadedUrls.length === 0) {
          toast.info("İlk görsel (Kapak) AI Vision ile temizleniyor...");
          fileToUpload = await processImageWithAIVision(fileToUpload, {
            paddingPercent: 10,
            outputFormat: "image/webp",
          });
        }
        const url = await uploadProductImage(fileToUpload);
        urls.push(url);
      }

      const combined = Array.from(new Set([...uploadedUrls, ...urls])).slice(0, 10);
      setUploadedUrls(combined);
      toast.success(
        `${urls.length} görsel yüklendi! Virgülle ayrılmış linkleri kopyalayıp Excel'deki "Görseller" sütununa yapıştırabilirsiniz.`
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Görsel yükleme hatası: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      setIsUploadingImages(false);
      if (imageHelperInputRef.current) imageHelperInputRef.current.value = "";
    }
  };

  const copyCommaSeparatedUrls = async () => {
    if (uploadedUrls.length === 0) return;
    const text = uploadedUrls.join(", ");
    await navigator.clipboard.writeText(text);
    setCopiedUrls(true);
    toast.success("Virgülle ayrılmış görsel linkleri panoya kopyalandı!");
    setTimeout(() => setCopiedUrls(false), 2000);
  };

  // ── Download sample Excel template with "Görseller" column ─────────────────
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "Ürün Adı": "Rolex Cosmograph Daytona 126529LN Le Mans",
        SKU: "HS21NC",
        Koleksiyon: "Rolex",
        Fiyat: "$2.700",
        Açıklama: "Örnek saat açıklaması",
        Durum: "yayinda",
        Mekanizma: "4132",
        Kasa: "Çelik",
        Boyut: "40 mm",
        "Su Rezistansı": "50 metre",
        "Güç Rezervi": "72 saat",
        Cam: "Safir Cam",
        Görseller:
          "https://ornek.com/kapak-resmi.webp, https://ornek.com/galeri-2.webp, https://ornek.com/galeri-3.webp",
      },
      {
        "Ürün Adı": "Hermes Kelly 25 Black Togo Leather PHW",
        SKU: "",
        Koleksiyon: "Rare Bags",
        Fiyat: "$1.900",
        Açıklama: "Hazır stok ve hemen teslim.",
        Durum: "yayinda",
        Mekanizma: "",
        Kasa: "",
        Boyut: "",
        "Su Rezistansı": "",
        "Güç Rezervi": "",
        Cam: "",
        Görseller: "https://ornek.com/canta-1.webp, https://ornek.com/canta-2.webp",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");
    XLSX.writeFile(workbook, "kbchrono_Toplu_Urun_Sablonu.xlsx");
    toast.success("Örnek Excel şablonu indirildi.");
  };

  // ── Parse Excel/CSV file & match existing products ─────────────────────────
  const handleExcelFile = async (file: File | undefined) => {
    if (!file) return;
    setIsParsingExcel(true);
    setExcelFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      if (rawJson.length === 0) {
        toast.error("Seçilen Excel/CSV dosyasında ürün satırı bulunamadı.");
        setRows([]);
        return;
      }

      // Fetch existing products to match by SKU or Name
      const existingRes = await getProductsServerFn();
      const existingProducts: any[] =
        existingRes.success && Array.isArray(existingRes.data)
          ? existingRes.data
          : [];

      const bySku = new Map<string, any>();
      const byName = new Map<string, any>();

      for (const p of existingProducts) {
        if (p.sku && String(p.sku).trim()) {
          bySku.set(String(p.sku).trim().toLowerCase(), p);
        }
        if (p.name && String(p.name).trim()) {
          byName.set(String(p.name).trim().toLowerCase(), p);
        }
      }

      const parsedRows: ParsedExcelRow[] = [];

      rawJson.forEach((row, idx) => {
        const name = String(
          row["Ürün Adı"] ?? row["Urun Adi"] ?? row["Name"] ?? row["name"] ?? ""
        ).trim();
        if (!name) return; // Skip empty rows

        const sku = String(row["SKU"] ?? row["Sku"] ?? row["sku"] ?? "").trim();
        const collection = String(
          row["Koleksiyon"] ?? row["Collection"] ?? row["collection"] ?? ""
        ).trim();
        const price = normalizePrice(
          row["Fiyat"] ?? row["Price"] ?? row["price"] ?? ""
        );
        const description = String(
          row["Açıklama"] ??
            row["Aciklama"] ??
            row["Description"] ??
            row["description"] ??
            ""
        ).trim();
        const status = normalizeStatus(
          row["Durum"] ?? row["Status"] ?? row["status"] ?? "yayinda"
        );
        const movement = String(
          row["Mekanizma"] ?? row["Movement"] ?? row["movement"] ?? ""
        ).trim();
        const case_material = String(
          row["Kasa"] ?? row["Case"] ?? row["case_material"] ?? ""
        ).trim();
        const case_size = String(
          row["Boyut"] ?? row["Size"] ?? row["case_size"] ?? ""
        ).trim();
        const water_resistance = String(
          row["Su Rezistansı"] ??
            row["Su Geçirmezlik"] ??
            row["Water Resistance"] ??
            row["water_resistance"] ??
            ""
        ).trim();
        const power_reserve = String(
          row["Güç Rezervi"] ??
            row["Guc Rezervi"] ??
            row["Power Reserve"] ??
            row["power_reserve"] ??
            ""
        ).trim();
        const crystal = String(
          row["Cam"] ?? row["Crystal"] ?? row["crystal"] ?? ""
        ).trim();

        const rawImagesCell =
          row["Görseller"] ??
          row["Gorseller"] ??
          row["Resimler"] ??
          row["Görsel"] ??
          row["Resim"] ??
          row["Images"] ??
          row["images"] ??
          row["Image"] ??
          "";

        const parsedUrls = parseImagesCell(rawImagesCell);

        // Match existing product by SKU first, then by Name
        const matched =
          (sku ? bySku.get(sku.toLowerCase()) : undefined) ||
          byName.get(name.toLowerCase());

        const existingImages: string[] = matched
          ? Array.isArray(matched.images) && matched.images.length > 0
            ? matched.images
            : matched.image
            ? [matched.image]
            : []
          : [];

        parsedRows.push({
          rowIndex: idx + 1,
          name,
          sku,
          collection: collection || matched?.collection || "Rolex",
          price,
          description,
          status,
          movement,
          case_material,
          case_size,
          water_resistance,
          power_reserve,
          crystal,
          images: parsedUrls,
          existingId: matched?.id,
          existingImages,
        });
      });

      setRows(parsedRows);
      const updateCount = parsedRows.filter((r) => r.existingId).length;
      const newCount = parsedRows.length - updateCount;
      toast.success(
        `${parsedRows.length} ürün okundu (${newCount} yeni eklenecek, ${updateCount} mevcut ürün güncellenecek).`
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Excel dosyası okunamadı: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      setIsParsingExcel(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  // ── Upload multiple images directly to a specific row in preview ───────────
  const handleRowImagesSelected = async (fileList: FileList | null) => {
    const targetRowIdx = activeRowForUploadRef.current;
    if (!fileList || fileList.length === 0 || targetRowIdx === null) return;

    const files = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 10);

    if (files.length === 0) return;

    setUploadingRowIndex(targetRowIdx);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadProductImage(file);
        uploaded.push(url);
      }

      setRows((prev) =>
        prev.map((r) => {
          if (r.rowIndex !== targetRowIdx) return r;
          const combined = Array.from(new Set([...r.images, ...uploaded])).slice(
            0,
            10
          );
          return { ...r, images: combined };
        })
      );
      toast.success(`${uploaded.length} görsel ürüne eklendi.`);
    } catch (err: any) {
      toast.error("Görsel yüklenemedi: " + err.message);
    } finally {
      setUploadingRowIndex(null);
      activeRowForUploadRef.current = null;
      if (rowImageInputRef.current) rowImageInputRef.current.value = "";
    }
  };

  const saveEditedRowUrls = (rowIndex: number) => {
    const urls = parseImagesCell(editingUrlValue);
    setRows((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? { ...r, images: urls } : r))
    );
    setEditingUrlRowIndex(null);
    setEditingUrlValue("");
    toast.success("Ürün görsel linkleri güncellendi.");
  };

  // ── Execute Bulk Import (Create / Update) ──────────────────────────────────
  const handleBulkImport = async () => {
    if (rows.length === 0) return;
    setIsImporting(true);
    setImportProgress({ current: 0, total: rows.length });

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setImportProgress({ current: i + 1, total: rows.length });

        const payload = {
          name: row.name,
          collection: row.collection,
          description: row.description,
          price: row.price,
          sku: row.sku,
          images: row.images.length > 0 ? row.images.slice(0, 10) : undefined,
          movement: row.movement,
          case_material: row.case_material,
          case_size: row.case_size,
          water_resistance: row.water_resistance,
          power_reserve: row.power_reserve,
          crystal: row.crystal,
          status: row.status,
        };

        if (row.existingId) {
          const res = await updateProductServerFn({
            data: {
              id: row.existingId,
              data: payload,
            },
          });
          if (res.success) updatedCount++;
          else errorCount++;
        } else {
          const res = await createProductServerFn({
            data: {
              ...payload,
              images: row.images.slice(0, 10),
            },
          });
          if (res.success) createdCount++;
          else errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(
          `Toplu aktarım tamamlandı! ${createdCount} yeni ürün eklendi, ${updatedCount} ürün güncellendi.`
        );
        setRows([]);
        setExcelFileName("");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.warning(
          `İşlem tamamlandı: ${createdCount} eklendi, ${updatedCount} güncellendi, ${errorCount} satırda hata oluştu.`
        );
        onSuccess();
      }
    } catch (err: any) {
      toast.error("Toplu aktarım sırasında hata: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const newRowsCount = rows.filter((r) => !r.existingId).length;
  const updateRowsCount = rows.filter((r) => r.existingId).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 bg-transparent border-none shadow-none focus:outline-none [&>button:last-child]:hidden">
        <div className="w-full max-h-[92vh] overflow-y-auto rounded-3xl glass-strong border border-border/40 custom-scrollbar animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="sticky top-0 z-20 p-6 bg-surface/90 backdrop-blur-xl border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold-soft border border-gold/25">
                <FileSpreadsheet className="h-5 w-5 text-gold" />
              </div>
              <div>
                <DialogTitle className="font-display text-2xl font-semibold">
                  Toplu Excel & Çoklu Görsel Yükle
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-0.5 text-[13px]">
                  Excel'deki <strong>Görseller</strong> sütununa virgülle ayrılmış çoklu resim linkleri girebilir veya aşağıdan fotoğrafları yükleyip linklerini otomatik alabilirsiniz.
                </DialogDescription>
              </div>
            </div>
            <DialogClose className="h-9 w-9 flex items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-gold hover:bg-gold hover:text-primary-foreground transition-all">
              <X className="h-5 w-5" strokeWidth={2.5} />
            </DialogClose>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* ── BÖLÜM 1: ÇOKLU RESİM YÜKLE & EXCEL İÇİN VİRGÜLLÜ LİNK ÜRET ── */}
            <section className="rounded-2xl border border-gold/25 bg-surface/40 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
                    Adım 1 (İsteğe Bağlı Yardımcı Araç)
                  </span>
                  <h3 className="font-display text-lg font-semibold text-foreground mt-0.5">
                    Çoklu Fotoğraf Yükle & Excel "Görseller" Sütunu İçin Link Al
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bir ürüne ait birden fazla fotoğrafı (en fazla 10 adet) seçin; sistem buluta yükleyip Excel'in{" "}
                    <code className="text-gold font-mono">Görseller</code> hücresine yapıştıracağınız virgüllü linkleri hazırlar.
                  </p>
                </div>

                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none bg-surface-elevated/60 px-3 py-2 rounded-xl border border-border/50 hover:border-gold/30">
                  <input
                    type="checkbox"
                    checked={useAiForFirstImage}
                    onChange={(e) => setUseAiForFirstImage(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <Wand2 className="h-3.5 w-3.5 text-gold" />
                  <span>1. fotoğrafın arka planını AI ile sil</span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Dropzone for generating URLs */}
                <div
                  onClick={() => !isUploadingImages && imageHelperInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isUploadingImages) handleHelperImageUpload(e.dataTransfer.files);
                  }}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border hover:border-gold/50 bg-surface/50 p-5 text-center cursor-pointer transition-all group"
                >
                  {isUploadingImages ? (
                    <>
                      <Loader2 className="h-7 w-7 animate-spin text-gold mb-2" />
                      <p className="text-xs font-medium text-foreground">
                        Görseller buluta yükleniyor...
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                        <ImagePlus className="h-5 w-5 text-gold" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        Ürünün fotoğraflarını buraya bırakın veya seçin
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Birden fazla fotoğraf seçebilirsiniz (İlk fotoğraf kapak olur)
                      </p>
                    </>
                  )}
                  <input
                    ref={imageHelperInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleHelperImageUpload(e.target.files)}
                  />
                </div>

                {/* Output box with comma-separated URLs */}
                <div className="flex flex-col justify-between rounded-xl border border-border bg-surface/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Excel <strong className="text-gold">Görseller</strong> Hücresine Yapıştırılacak Metin ({uploadedUrls.length} fotoğraf):
                    </span>
                    {uploadedUrls.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUploadedUrls([])}
                        className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Temizle
                      </button>
                    )}
                  </div>

                  {uploadedUrls.length > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {uploadedUrls.map((u, idx) => (
                          <div
                            key={u}
                            className="relative h-11 w-11 shrink-0 rounded-lg border border-gold/30 overflow-hidden bg-background"
                            title={idx === 0 ? "Kapak Görseli" : `${idx + 1}. Görsel`}
                          >
                            <img src={u} alt="" className="h-full w-full object-cover" />
                            {idx === 0 && (
                              <span className="absolute bottom-0 inset-x-0 bg-gold text-[8px] font-bold text-primary-foreground text-center">
                                KAPAK
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={uploadedUrls.join(", ")}
                        className="w-full rounded-lg border border-border bg-background/70 px-3 py-1.5 text-[11px] font-mono text-foreground"
                      />
                      <button
                        type="button"
                        onClick={copyCommaSeparatedUrls}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground shadow-gold-glow"
                      >
                        {copiedUrls ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Kopyalandı! Excel'de "Görseller" Sütununa Yapıştırın
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Virgülle Ayrılmış Linkleri Kopyala
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-[11px] text-muted-foreground/70 py-4">
                      Sol taraftan fotoğraf seçtiğinizde virgülle ayrılmış linkler (`url1, url2, url3`) burada oluşur.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── BÖLÜM 2: EXCEL / CSV DOSYASI SEÇİMİ & ŞABLON İNDİRME ── */}
            <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
                    Adım 2
                  </span>
                  <h3 className="font-display text-lg font-semibold text-foreground mt-0.5">
                    Excel (.xlsx) veya CSV Dosyasını Yükleyin
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Aynı <strong>SKU</strong> veya <strong>Ürün Adı</strong> sistemde varsa mevcut ürünü günceller, yoksa yeni ürün olarak ekler.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold/20 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  Örnek Excel Şablonu İndir ("Görseller" Sütunlu)
                </button>
              </div>

              <div
                onClick={() => !isParsingExcel && excelInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!isParsingExcel) handleExcelFile(e.dataTransfer.files?.[0]);
                }}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border hover:border-gold/50 bg-surface/30 py-8 px-6 text-center cursor-pointer transition-all"
              >
                {isParsingExcel ? (
                  <div className="flex items-center gap-2 text-sm text-gold">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Excel dosyası analiz ediliyor...
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-gold mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      {excelFileName
                        ? `Seçilen Dosya: ${excelFileName} (Değiştirmek için tıklayın)`
                        : "Excel (.xlsx, .xls) veya .csv dosyanızı buraya bırakın"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Desteklenen sütunlar: <code className="text-gold">Ürün Adı, SKU, Koleksiyon, Fiyat, Açıklama, Durum, Mekanizma, Kasa, Boyut, Su Rezistansı, Güç Rezervi, Cam, Görseller</code>
                    </p>
                  </>
                )}
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleExcelFile(e.target.files?.[0])}
                />
              </div>
            </section>

            {/* Hidden input for per-row direct multi-image upload */}
            <input
              ref={rowImageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleRowImagesSelected(e.target.files)}
            />

            {/* ── BÖLÜM 3: ÖNİZLEME TABLOSU VE SATIR BAZLI ÇOKLU RESİM EKLEME ── */}
            {rows.length > 0 && (
              <section className="rounded-2xl border border-border bg-surface/40 overflow-hidden space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border/50 bg-surface-elevated/40">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-semibold text-foreground">
                      Önizleme ({rows.length} Ürün)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                      <PlusCircle className="h-3 w-3" /> {newRowsCount} Yeni Eklenecek
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                      <RefreshCw className="h-3 w-3" /> {updateRowsCount} Güncellenecek
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    İpucu: Her satırın sağındaki <strong>+ Resim Seç</strong> veya <strong>Link Gir</strong> butonuyla da o ürüne çoklu görsel ekleyebilirsiniz.
                  </p>
                </div>

                <div className="max-h-[340px] overflow-y-auto divide-y divide-border/40 custom-scrollbar">
                  {rows.map((r) => {
                    const effectiveImages =
                      r.images.length > 0 ? r.images : r.existingImages || [];
                    const isRowUploading = uploadingRowIndex === r.rowIndex;

                    return (
                      <div
                        key={r.rowIndex}
                        className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/60 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {r.existingId ? (
                              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-400">
                                GÜNCELLE
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                                YENİ
                              </span>
                            )}
                            <span className="text-xs font-semibold text-foreground truncate">
                              {r.name}
                            </span>
                            {r.sku && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                ({r.sku})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{r.collection || "Koleksiyon Yok"}</span>
                            <span>•</span>
                            <span className="text-gold font-medium">
                              {r.price || "Fiyat Belirtilmedi"}
                            </span>
                            <span>•</span>
                            <span>
                              {r.images.length > 0
                                ? `${r.images.length} yeni görsel`
                                : r.existingImages && r.existingImages.length > 0
                                ? `${r.existingImages.length} mevcut görsel korunacak`
                                : "Görsel yok (Varsayılan kapak)"}
                            </span>
                          </div>

                          {editingUrlRowIndex === r.rowIndex && (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingUrlValue}
                                onChange={(e) => setEditingUrlValue(e.target.value)}
                                placeholder="Virgülle ayrılmış resim linkleri: https://..., https://..."
                                className="flex-1 rounded-lg border border-gold/40 bg-background px-3 py-1.5 text-xs font-mono text-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => saveEditedRowUrls(r.rowIndex)}
                                className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUrlRowIndex(null)}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground"
                              >
                                İptal
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Thumbnails + Add Multi-Images to this Row */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center -space-x-1.5">
                            {effectiveImages.slice(0, 4).map((imgUrl, idx) => (
                              <img
                                key={idx}
                                src={imgUrl}
                                alt=""
                                className="h-8 w-8 rounded-lg border border-border object-cover bg-background"
                              />
                            ))}
                            {effectiveImages.length > 4 && (
                              <span className="h-8 w-8 rounded-lg border border-border bg-surface-elevated flex items-center justify-center text-[10px] font-mono text-gold">
                                +{effectiveImages.length - 4}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={isRowUploading || isImporting}
                            onClick={() => {
                              activeRowForUploadRef.current = r.rowIndex;
                              rowImageInputRef.current?.click();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/20 transition-all disabled:opacity-50"
                            title="Bilgisayardan bu ürüne birden fazla fotoğraf yükle"
                          >
                            {isRowUploading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ImagePlus className="h-3.5 w-3.5" />
                            )}
                            <span>+ Resim Seç</span>
                          </button>

                          <button
                            type="button"
                            disabled={isImporting}
                            onClick={() => {
                              setEditingUrlRowIndex(r.rowIndex);
                              setEditingUrlValue(r.images.join(", "));
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated/60 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all"
                            title="Virgülle ayrılmış resim URL'lerini düzenle"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            <span>Link Gir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-surface-elevated/60 border-t border-border/50">
                  {isImporting ? (
                    <div className="flex items-center gap-3 text-xs text-gold font-medium">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        Aktarılıyor: {importProgress.current} / {importProgress.total} ürün...
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Toplam <strong>{rows.length}</strong> ürün aktarıma hazır.
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={() => {
                        setRows([]);
                        setExcelFileName("");
                      }}
                      className="rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                    >
                      Listeyi Temizle
                    </button>
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={handleBulkImport}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-gold-glow hover:-translate-y-0.5 transition-all disabled:opacity-50"
                    >
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      <span>
                        {isImporting
                          ? "İçe Aktarılıyor..."
                          : `${rows.length} Ürünü Kaydet ve Yayınla`}
                      </span>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
