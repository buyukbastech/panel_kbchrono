import { useCallback, useRef, useState, useEffect } from "react";
import { ImagePlus, UploadCloud, X, Star, Cloud, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { processImageWithAIVision } from "@/lib/ai-vision";

type Preview = { id: string; url: string; name: string; size: number };

interface ImageDropzoneProps {
  onChange?: (newFiles: File[], existingUrls: string[]) => void;
  value?: string[];
}

export function ImageDropzone({ onChange, value = [] }: ImageDropzoneProps) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Sadece ilk yüklemede ve previews boşken mevcut görselleri yükle
    // initialized ref'i Strict Mode'daki çift render sorununu engeller
    if (value && value.length > 0 && !initialized.current) {
      initialized.current = true;
      
      // Tekilleştirme ve Sınırlandırma: Aynı URL'leri temizle ve en fazla ilk 6 tanesini al
      const uniqueUrls = Array.from(new Set(value)).slice(0, 6);
      
      const initialPreviews = uniqueUrls.map(url => ({
        id: crypto.randomUUID(),
        url,
        name: url.split('/').pop() || 'mevcut-gorsel',
        size: 0
      }));
      setPreviews(initialPreviews);
    }
  }, [value]);

  const handleFiles = useCallback(async (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    
    const newFilesArray = Array.from(incomingFiles).filter((f) => f.type.startsWith("image/"));
    
    if (previews.length + newFilesArray.length > 6) {
      toast.error("En fazla 6 fotoğraf ekleyebilirsiniz.");
      return;
    }

    setIsProcessing(true);
    const hasFirstImage = previews.length === 0;
    
    if (hasFirstImage) {
      toast.info("AI Vision: Kapak fotoğrafı arka planı temizleniyor ve hizalanıyor...", { icon: <Wand2 className="h-4 w-4 text-gold" /> });
    } else {
      toast.info("Görseller galeriye ekleniyor...", { icon: <ImagePlus className="h-4 w-4 text-gold" /> });
    }

    try {
      // Sadece 1. görselin (Kapak / index 0) arka planını kaldır, diğerlerine dokunma
      const processedFiles = await Promise.all(
        newFilesArray.map(async (f, i) => {
          const finalIndex = previews.length + i;
          if (finalIndex === 0) {
            // İlk görsel: AI arka plan silme çalışsın
            return await processImageWithAIVision(f, { paddingPercent: 10, outputFormat: "image/webp" });
          } else {
            // Diğer görseller: Arka planı elleme, orijinal dosyayı koru
            return f;
          }
        })
      );

      const nextPreviews: Preview[] = processedFiles.map((f) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(f),
        name: f.name,
        size: f.size,
      }));
      
      const updatedPreviews = [...previews, ...nextPreviews];
      const updatedFiles = [...files, ...processedFiles];
      
      setPreviews(updatedPreviews);
      setFiles(updatedFiles);
      
      const existingUrls = updatedPreviews
        .filter(p => !p.url.startsWith('blob:'))
        .map(p => p.url);
        
      onChange?.(updatedFiles, existingUrls);
      
      if (hasFirstImage) {
        toast.success("Kapak fotoğrafı AI Vision ile işlendi, diğer görseller orijinal haliyle eklendi.");
      } else {
        toast.success("Görseller orijinal haliyle başarıyla eklendi.");
      }
    } catch (error: any) {
      toast.error("Görüntü işlenirken bir hata oluştu.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, [onChange, previews, files]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const remove = (id: string) => {
    const target = previews.find((p) => p.id === id);
    if (!target) return;

    if (target.url.startsWith('blob:')) {
      URL.revokeObjectURL(target.url);
    }

    const newPreviews = previews.filter((p) => p.id !== id);
    
    let newFiles = files;
    if (target.url.startsWith('blob:')) {
      const blobIndex = previews
        .filter(p => p.url.startsWith('blob:'))
        .findIndex(p => p.id === id);
      if (blobIndex !== -1) {
        newFiles = files.filter((_, i) => i !== blobIndex);
      }
    }

    setPreviews(newPreviews);
    setFiles(newFiles);

    const existingUrls = newPreviews
      .filter(p => !p.url.startsWith('blob:'))
      .map(p => p.url);
      
    onChange?.(newFiles, existingUrls);
  };

  const fmt = (b: number) =>
    b < 1024 * 1024
      ? `${(b / 1024).toFixed(0)} KB`
      : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-dashed transition-all duration-300 ${
          isDragging
            ? "border-gold bg-gradient-gold-soft scale-[1.01] shadow-gold-glow"
            : "border-border bg-surface/40 hover:border-gold/50 hover:bg-surface/60"
        }`}
      >
        {/* Ambient glow */}
        <div
          className={`absolute -inset-20 bg-gradient-gold-soft opacity-0 blur-3xl transition-opacity duration-500 ${
            isDragging ? "opacity-100" : "group-hover:opacity-60"
          }`}
        />

        <div className={`relative flex flex-col items-center justify-center text-center transition-all ${
          previews.length > 0 ? "px-6 py-8" : "px-8 py-16"
        }`}>
          <div
            className={`relative mb-4 flex items-center justify-center rounded-2xl transition-all duration-300 ${
              previews.length > 0 ? "h-12 w-12" : "h-16 w-16"
            } ${
              isDragging || isProcessing
                ? "bg-gradient-gold scale-110 rotate-3"
                : "glass group-hover:scale-105"
            }`}
          >
            {isProcessing ? (
              <Loader2 className={`${previews.length > 0 ? "h-5 w-5" : "h-7 w-7"} animate-spin text-primary-foreground`} strokeWidth={1.75} />
            ) : (
              <UploadCloud
                className={`${previews.length > 0 ? "h-5 w-5" : "h-7 w-7"} transition-colors ${
                  isDragging ? "text-primary-foreground" : "text-gold"
                }`}
                strokeWidth={1.75}
              />
            )}
            {(isDragging || isProcessing) && (
              <span className="absolute inset-0 rounded-2xl animate-ping bg-gold/30" />
            )}
          </div>
          <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {isProcessing ? "AI Vision İşliyor..." : isDragging ? "Yüklemek için bırakın" : "Görsellerinizi buraya bırakın"}
          </p>
          <div className="mt-2 text-sm text-muted-foreground">
            {isProcessing ? (
              <span className="text-gold font-medium flex items-center justify-center gap-2">
                <Wand2 className="h-4 w-4 animate-pulse" /> Akıllı arka plan silme devrede
              </span>
            ) : previews.length > 0 ? (
              <span className="text-emerald-400 font-medium">+{previews.length} görsel eklendi</span>
            ) : (
              <>
                Sürükle & bırak veya{" "}
                <span className="text-gold font-medium underline-offset-4 hover:underline">
                  dosyalara göz at
                </span>
              </>
            )}
          </div>
          <div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full bg-surface-elevated px-2.5 py-1">
              PNG
            </span>
            <span className="rounded-full bg-surface-elevated px-2.5 py-1">
              JPG
            </span>
            <span className="rounded-full bg-surface-elevated px-2.5 py-1">
              WEBP
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span>10MB'a kadar</span>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {previews.length > 0 && (
        <div className="animate-fade-up">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Galeri
              </p>
              <span className="rounded-full bg-gold-muted px-2 py-0.5 text-[10px] font-medium text-gold">
                {previews.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                previews.forEach((p) => URL.revokeObjectURL(p.url));
                setPreviews([]);
                setFiles([]);
                onChange?.([], []);
              }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Tümünü temizle
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {previews.map((p, i) => (
              <figure
                key={p.id}
                className="group relative overflow-hidden rounded-2xl glass hover-lift animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative aspect-square p-2">
                  <div className="relative h-full w-full overflow-hidden rounded-xl gold-ring">
                    <img
                      src={p.url}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                  </div>
                  {i === 0 && (
                    <span className="absolute left-3.5 top-3.5 flex items-center gap-1 rounded-full bg-gradient-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-soft">
                      <Star
                        className="h-2.5 w-2.5 fill-current"
                        strokeWidth={2}
                      />
                      Kapak
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(p.id);
                    }}
                    className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full glass-strong text-foreground opacity-0 transition-all hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                    aria-label="Görseli kaldır"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
                <figcaption className="px-3.5 pb-3 pt-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {p.name}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {fmt(p.size)}
                  </p>
                </figcaption>
              </figure>
            ))}

            {/* Add more tile */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/30 text-muted-foreground transition-all hover:border-gold/50 hover:bg-gradient-gold-soft hover:text-gold hover-lift"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl glass group-hover:scale-110 transition-transform">
                <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium">
                Daha fazla ekle
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
