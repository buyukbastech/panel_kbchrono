import { useState } from "react";
import { Hash, Tag, Watch, Image as ImageIcon, Save, Send, AlignLeft, Loader2, Settings, Languages, SlidersHorizontal } from "lucide-react";
import { createProductServerFn, updateProductServerFn } from "@/lib/products-server";
import { uploadProductImage } from "@/lib/storage";
import { toast } from "sonner";
import { ImageDropzone } from "./ImageDropzone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const collections = [
  "Richard Mille",
  "Audemars Piguet",
  "Rolex",
  "Patek Philippe",
  "Cartier",
  "Jaeger LeCoultre",
  "Omega",
  "F.P Journe",
  "Hublot",
  "Frank Muller",
  "IWC",
  "Rare Bags",
  "Jewellery",
  "Personalization",
  "Old Money",
];

const languages = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇦🇪' },
];

function SectionHeader({
  step,
  title,
  hint,
  icon: Icon,
}: {
  step: string;
  title: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 sm:px-7 py-4 sm:py-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-gold-soft border border-gold/20">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gold" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.25em] text-gold">
            {step}
          </p>
          <h2 className="mt-0.5 font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
      </div>
      {hint && (
        <span className="hidden sm:block text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </header>
  );
}

interface ProductFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export function ProductForm({ initialData, onSuccess }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeLang, setActiveLang] = useState('tr');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    sku: initialData?.sku || "",
    collection: initialData?.collection || "",
    description: initialData?.description || "",
    price: initialData?.price || "",
    images: Array.from(new Set(initialData?.images || [] as string[])).slice(0, 6) as string[],
    movement: initialData?.movement || "",
    case_material: initialData?.case_material || "",
    case_size: initialData?.case_size || "",
    water_resistance: initialData?.water_resistance || "",
    power_reserve: initialData?.power_reserve || "",
    crystal: initialData?.crystal || "",
    status: initialData?.status || "taslak",
    translations: initialData?.translations || {
      en: {},
      ar: {}
    },
    metadata: {
      model: initialData?.translations?.metadata?.model || "",
      concept: initialData?.translations?.metadata?.concept || "",
      range: initialData?.translations?.metadata?.range || "",
      type: initialData?.translations?.metadata?.type || "",
      material: initialData?.translations?.metadata?.material || "",
      color: initialData?.translations?.metadata?.color || "",
    }
  });

  const isWatchCollection = !["Rare Bags", "Jewellery", "Personalization", "Old Money"].includes(formData.collection);

  // --- Auto Translation ---
  const translateText = async (text: string, targetLang: string): Promise<string> => {
    if (!text || !text.trim()) return '';
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=tr|${targetLang}`
      );
      const json = await res.json();
      return json?.responseData?.translatedText || text;
    } catch {
      return text; // fallback to original on error
    }
  };

  const autoTranslate = async () => {
    setIsTranslating(true);
    toast.info('Çeviriler hazırlanıyor, lütfen bekleyin...');
    try {
      const fieldsToTranslate = [
        'name', 'description', 'collection',
        'movement', 'case_material', 'water_resistance', 'power_reserve', 'crystal'
      ];

      const newTranslations: any = {
        en: { ...(formData.translations?.en || {}) },
        ar: { ...(formData.translations?.ar || {}) },
      };

      for (const field of fieldsToTranslate) {
        const trValue = (formData as any)[field];
        if (!trValue) continue;
        // Translate to EN and AR in parallel
        const [enVal, arVal] = await Promise.all([
          translateText(trValue, 'en'),
          translateText(trValue, 'ar'),
        ]);
        newTranslations.en[field] = enVal;
        newTranslations.ar[field] = arVal;
      }

      setFormData(prev => ({ ...prev, translations: newTranslations }));
      toast.success('Çeviriler tamamlandı! EN ve AR sekmeleri dolduruldu.');
    } catch (err) {
      toast.error('Çeviri sırasında hata oluştu.');
    } finally {
      setIsTranslating(false);
    }
  };
  // --- End Auto Translation ---

  const updateField = (field: string, value: string) => {
    if (activeLang === 'tr') {
      setFormData({ ...formData, [field]: value });
    } else {
      const newTranslations = { ...formData.translations };
      if (!newTranslations[activeLang]) newTranslations[activeLang] = {};
      newTranslations[activeLang][field] = value;
      setFormData({ ...formData, translations: newTranslations });
    }
  };

  const getField = (field: string) => {
    if (activeLang === 'tr') {
      return (formData as any)[field] || "";
    }
    return formData.translations?.[activeLang]?.[field] || "";
  };

  const handleSubmit = async (e: React.FormEvent, forceStatus?: string) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    const status = forceStatus || formData.status;

    try {
      // 1. Auto-translate if translations are empty
      let finalTranslations = formData.translations;
      const enEmpty = !finalTranslations?.en?.name && !finalTranslations?.en?.description;
      if (enEmpty && formData.name) {
        toast.info('Otomatik çeviriler oluşturuluyor...');
        const fieldsToTranslate = [
          'name', 'description', 'collection',
          'movement', 'case_material', 'water_resistance', 'power_reserve', 'crystal'
        ];
        const newTranslations: any = { en: {}, ar: {} };
        for (const field of fieldsToTranslate) {
          const trValue = (formData as any)[field];
          if (!trValue) continue;
          const [enVal, arVal] = await Promise.all([
            translateText(trValue, 'en'),
            translateText(trValue, 'ar'),
          ]);
          newTranslations.en[field] = enVal;
          newTranslations.ar[field] = arVal;
        }
        finalTranslations = newTranslations;
        setFormData(prev => ({ ...prev, translations: newTranslations }));
      }

      // 2. Upload images if there are any
      let uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        toast.info("Görseller yükleniyor...");
        uploadedUrls = await Promise.all(
          imageFiles.map(file => uploadProductImage(file))
        );
      }

      // 3. Submit to server
      finalTranslations = {
        ...finalTranslations,
        metadata: formData.metadata
      };

      let result;
      if (initialData?.id) {
        result = await updateProductServerFn({
          data: {
            id: initialData.id,
            data: {
              name: formData.name,
              collection: formData.collection,
              description: formData.description,
              price: formData.price,
              sku: formData.sku,
              images: ([...formData.images, ...uploadedUrls] as string[]).slice(0, 6),
              movement: formData.movement,
              case_material: formData.case_material,
              case_size: formData.case_size,
              water_resistance: formData.water_resistance,
              power_reserve: formData.power_reserve,
              crystal: formData.crystal,
              status: status,
              translations: finalTranslations
            }
          }
        });
      } else {
        result = await createProductServerFn({
          data: {
            name: formData.name,
            collection: formData.collection,
            description: formData.description,
            price: formData.price,
            sku: formData.sku,
            images: uploadedUrls.slice(0, 6),
            movement: formData.movement,
            case_material: formData.case_material,
            case_size: formData.case_size,
            water_resistance: formData.water_resistance,
            power_reserve: formData.power_reserve,
            crystal: formData.crystal,
            status: status,
            translations: finalTranslations
          }
        });
      }

      if (result.success) {
        toast.success(initialData?.id ? "Ürün güncellendi." : (status === 'yayinda' ? "Ürün başarıyla yayınlandı." : "Taslak kaydedildi."));
        onSuccess?.();
      } else {
        toast.error("Hata: " + (result.error || "Bilinmeyen bir hata oluştu."));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Hata oluştu: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {/* Language Switcher + Auto Translate Button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 p-1 bg-surface-elevated/50 backdrop-blur-md border border-border/40 rounded-2xl">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActiveLang(lang.code)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeLang === lang.code 
                  ? 'bg-gradient-gold text-primary-foreground shadow-gold-glow' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>

        {/* Auto Translate Button */}
        <button
          type="button"
          onClick={autoTranslate}
          disabled={isTranslating || isSubmitting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gold/40 bg-gold/5 text-gold text-xs font-semibold hover:bg-gold/15 transition-all disabled:opacity-50"
        >
          {isTranslating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Languages className="h-3.5 w-3.5" />
          )}
          {isTranslating ? 'Çevriliyor...' : '✨ Otomatik Çevir (TR→EN+AR)'}
        </button>
      </div>

      {/* Section: Essentials */}
      <section className="rounded-2xl glass shadow-soft animate-fade-up">
        <SectionHeader
          step="Adım 01"
          title={`${activeLang === 'tr' ? 'Ürün Bilgileri' : activeLang === 'en' ? 'Product Information' : 'معلومات المنتج'}`}
          hint="Zorunlu alanlar"
          icon={Watch}
        />

        <div className="grid gap-6 px-7 py-7 md:grid-cols-2">
          {/* Title */}
          <div className="md:col-span-2 space-y-2">
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              <Tag className="h-3 w-3 text-gold" strokeWidth={2} />
              Ürün Başlığı ({activeLang.toUpperCase()})
            </label>
            <div className="relative group">
              <input
                type="text"
                value={getField('name')}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-xl border border-border bg-input/60 px-4 py-3.5 font-display text-lg font-medium text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:bg-input transition-all"
                placeholder="ör. Heritage Chronograph 39mm"
                disabled={isSubmitting}
                dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          {/* Serial */}
          {isWatchCollection && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                <Hash className="h-3 w-3 text-gold" strokeWidth={2} />
                Seri Numarası
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full rounded-xl border border-border bg-input/60 px-4 py-3.5 font-mono text-sm text-foreground tracking-wider focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:bg-input transition-all"
                placeholder="MH-XXXX-####"
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-gold/60" />
                Kasa arkasına kazınmış benzersiz referans
              </p>
            </div>
          )}

          {/* Price */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              <Tag className="h-3 w-3 text-gold" strokeWidth={2} />
              Fiyat (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold font-bold text-sm select-none">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={formData.price ? formData.price.replace(/[₺$. ]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                  const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                  setFormData({ ...formData, price: `$${formatted}` });
                }}
                className="w-full rounded-xl border border-border bg-input/60 pl-8 pr-4 py-3.5 text-sm text-foreground focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:bg-input transition-all"
                placeholder="48.500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Collection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              <span className="h-3 w-3 rounded-sm bg-gradient-gold" />
              Koleksiyon {activeLang !== 'tr' && `(${activeLang.toUpperCase()})`}
            </label>
            {activeLang === 'tr' ? (
              <Select
                value={formData.collection}
                onValueChange={(val) => setFormData({ ...formData, collection: val })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full rounded-xl border border-border bg-input/60 px-4 py-3.5 h-auto text-sm text-foreground focus:ring-2 focus:ring-gold/20 focus:border-gold/60 transition-all">
                  <SelectValue placeholder="Bir koleksiyon seçin…" />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated/95 backdrop-blur-xl border-border/40 text-foreground">
                  {collections.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="focus:bg-gold/10 focus:text-gold transition-colors cursor-pointer py-2.5"
                    >
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                type="text"
                value={getField('collection')}
                onChange={(e) => updateField('collection', e.target.value)}
                className="w-full rounded-xl border border-border bg-input/60 px-4 py-3.5 text-sm text-foreground focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:bg-input transition-all"
                placeholder={formData.collection}
                disabled={isSubmitting}
                dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
              />
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2 space-y-2">
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              <AlignLeft className="h-3 w-3 text-gold" strokeWidth={2} />
              Ürün Açıklaması ({activeLang.toUpperCase()})
            </label>
            <textarea
              rows={4}
              value={getField('description')}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-xl border border-border bg-input/60 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:bg-input transition-all resize-none"
              placeholder="Ürünün hikayesi, teknik detayları ve özel işçiliği hakkında bilgi verin…"
              disabled={isSubmitting}
              dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>
        </div>
      </section>

      {/* Section: Filtering & Classification */}
      {isWatchCollection && (
        <section 
          className="rounded-2xl glass shadow-soft animate-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          <SectionHeader
          step="Adım 02"
          title="Filtreleme & Sınıflandırma"
          hint="Vitrinde arama ve filtreleme için kullanılır"
          icon={SlidersHorizontal}
        />

        <div className="grid gap-5 sm:gap-6 px-4 sm:px-7 py-6 sm:py-7 md:grid-cols-2 lg:grid-cols-3">
          {/* Model */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Model</label>
            <input
              type="text"
              value={formData.metadata.model}
              onChange={(e) => setFormData({ 
                ...formData, 
                metadata: { ...formData.metadata, model: e.target.value } 
              })}
              className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 text-sm text-foreground focus:border-gold/60 focus:outline-none transition-all"
              placeholder="ör. Royal Oak, RM 67-02"
              disabled={isSubmitting}
            />
          </div>

          {/* Concept */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Concept</label>
            <Select
              value={formData.metadata.concept}
              onValueChange={(val) => setFormData({ 
                ...formData, 
                metadata: { ...formData.metadata, concept: val } 
              })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 h-auto text-sm text-foreground focus:ring-2 focus:ring-gold/20 focus:border-gold/60 transition-all">
                <SelectValue placeholder="Konsept seçin…" />
              </SelectTrigger>
              <SelectContent className="bg-surface-elevated/95 backdrop-blur-xl border-border/40 text-foreground">
                {["Lifestyle", "Sports", "Aviation"].map((item) => (
                  <SelectItem key={item} value={item} className="focus:bg-gold/10 focus:text-gold transition-colors cursor-pointer py-2.5">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Range */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Range</label>
            <Select
              value={formData.metadata.range}
              onValueChange={(val) => setFormData({ 
                ...formData, 
                metadata: { ...formData.metadata, range: val } 
              })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 h-auto text-sm text-foreground focus:ring-2 focus:ring-gold/20 focus:border-gold/60 transition-all">
                <SelectValue placeholder="Cinsiyet seçin…" />
              </SelectTrigger>
              <SelectContent className="bg-surface-elevated/95 backdrop-blur-xl border-border/40 text-foreground">
                {["Erkek", "Kadın", "Unisex"].map((item) => (
                  <SelectItem key={item} value={item} className="focus:bg-gold/10 focus:text-gold transition-colors cursor-pointer py-2.5">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Type</label>
            <Select
              value={formData.metadata.type}
              onValueChange={(val) => setFormData({ 
                ...formData, 
                metadata: { ...formData.metadata, type: val } 
              })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 h-auto text-sm text-foreground focus:ring-2 focus:ring-gold/20 focus:border-gold/60 transition-all">
                <SelectValue placeholder="Tip seçin…" />
              </SelectTrigger>
              <SelectContent className="bg-surface-elevated/95 backdrop-blur-xl border-border/40 text-foreground">
                {["Automatic", "Manual Winding", "Chronograph"].map((item) => (
                  <SelectItem key={item} value={item} className="focus:bg-gold/10 focus:text-gold transition-colors cursor-pointer py-2.5">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Material */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Material</label>
            <Select
              value={formData.metadata.material}
              onValueChange={(val) => setFormData({ 
                ...formData, 
                metadata: { ...formData.metadata, material: val } 
              })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 h-auto text-sm text-foreground focus:ring-2 focus:ring-gold/20 focus:border-gold/60 transition-all">
                <SelectValue placeholder="Materyal seçin…" />
              </SelectTrigger>
              <SelectContent className="bg-surface-elevated/95 backdrop-blur-xl border-border/40 text-foreground">
                {["Carbon", "Ceramic", "Rose Gold", "Titanium", "White Gold", "Yellow Gold", "Steel"].map((item) => (
                  <SelectItem key={item} value={item} className="focus:bg-gold/10 focus:text-gold transition-colors cursor-pointer py-2.5">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Color</label>
            <Select
              value={formData.metadata.color}
              onValueChange={(val) => setFormData({ 
                ...formData, 
                metadata: { ...formData.metadata, color: val } 
              })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 h-auto text-sm text-foreground focus:ring-2 focus:ring-gold/20 focus:border-gold/60 transition-all">
                <SelectValue placeholder="Renk seçin…" />
              </SelectTrigger>
              <SelectContent className="bg-surface-elevated/95 backdrop-blur-xl border-border/40 text-foreground">
                {["Black", "Blue", "Gold", "Green", "Grey", "Orange", "Red", "White", "Skeleton"].map((item) => (
                  <SelectItem key={item} value={item} className="focus:bg-gold/10 focus:text-gold transition-colors cursor-pointer py-2.5">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
      )}

      {/* Section: Technical specifications */}
      {isWatchCollection && (
        <section 
          className="rounded-2xl glass shadow-soft animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          <SectionHeader
          step="Adım 03"
          title="Teknik Özellikler"
          hint="Mühendislik detayları"
          icon={Settings}
        />

        <div className="grid gap-5 sm:gap-6 px-4 sm:px-7 py-6 sm:py-7 md:grid-cols-2 lg:grid-cols-3">
          {/* Mekanizma */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Mekanizma ({activeLang.toUpperCase()})</label>
            <input
              type="text"
              value={getField('movement')}
              onChange={(e) => updateField('movement', e.target.value)}
              className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 text-sm text-foreground focus:border-gold/60 focus:outline-none transition-all"
              placeholder="ör. Otomatik İsviçre Mekanizması"
              disabled={isSubmitting}
              dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Kasa Materyali */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Kasa Materyali ({activeLang.toUpperCase()})</label>
            <input
              type="text"
              value={getField('case_material')}
              onChange={(e) => updateField('case_material', e.target.value)}
              className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 text-sm text-foreground focus:border-gold/60 focus:outline-none transition-all"
              placeholder="ör. 5. Sınıf Titanyum"
              disabled={isSubmitting}
              dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Kasa Çapı */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Kasa Çapı</label>
            <input
              type="text"
              value={formData.case_size}
              onChange={(e) => setFormData({ ...formData, case_size: e.target.value })}
              className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 text-sm text-foreground focus:border-gold/60 focus:outline-none transition-all"
              placeholder="ör. 42mm"
              disabled={isSubmitting}
            />
          </div>

          {/* Su Geçirmezlik */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Su Geçirmezlik ({activeLang.toUpperCase()})</label>
            <input
              type="text"
              value={getField('water_resistance')}
              onChange={(e) => updateField('water_resistance', e.target.value)}
              className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 text-sm text-foreground focus:border-gold/60 focus:outline-none transition-all"
              placeholder="ör. 50 metre"
              disabled={isSubmitting}
              dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Güç Rezervi */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Güç Rezervi ({activeLang.toUpperCase()})</label>
            <input
              type="text"
              value={getField('power_reserve')}
              onChange={(e) => updateField('power_reserve', e.target.value)}
              className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 text-sm text-foreground focus:border-gold/60 focus:outline-none transition-all"
              placeholder="ör. 60 saat"
              disabled={isSubmitting}
              dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Cam */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Cam ({activeLang.toUpperCase()})</label>
            <input
              type="text"
              value={getField('crystal')}
              onChange={(e) => updateField('crystal', e.target.value)}
              className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 text-sm text-foreground focus:border-gold/60 focus:outline-none transition-all"
              placeholder="ör. Safir Cam"
              disabled={isSubmitting}
              dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>
        </div>
      </section>
      )}

      {/* Section: Imagery */}
      <section
        className="rounded-2xl glass shadow-soft animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <SectionHeader
          step={isWatchCollection ? "Adım 04" : "Adım 02"}
          title="Görseller"
          hint="İlk görsel kapak fotoğrafı olur"
          icon={ImageIcon}
        />

        <div className="px-4 sm:px-7 py-6 sm:py-7">
          <ImageDropzone 
            value={formData.images}
            onChange={(newFiles, existingUrls) => {
              setImageFiles(newFiles);
              setFormData(prev => ({ ...prev, images: existingUrls }));
            }} 
          />
        </div>
      </section>

      {/* Action bar */}
      <div className="mt-12 animate-fade-up">
        <div className="flex flex-col-reverse gap-3 rounded-2xl glass-strong px-5 py-4 shadow-luxe sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-xs">
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e as any, "taslak")}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-sm text-foreground hover:border-gold/40 hover:text-gold transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" strokeWidth={1.75} />
              Taslak Kaydet
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e as any, "yayinda")}
              className="group flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-semibold tracking-tight text-primary-foreground shadow-gold-glow hover:shadow-[0_0_60px_-5px_oklch(0.65_0.23_295_/_0.7)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2}
                />
              )}
              {isSubmitting ? (initialData?.id ? "Güncelleniyor..." : "Yayınlanıyor...") : (initialData?.id ? "Ürünü Güncelle" : "Ürünü Yayınla")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
