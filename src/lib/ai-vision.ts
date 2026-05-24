import { removeBackground } from "@imgly/background-removal";

export interface AIVisionOptions {
  paddingPercent?: number; // 8 to 10 percent
  outputFormat?: "image/webp" | "image/png";
  outputSize?: number; // e.g. 1080 for 1080x1080
}

/**
 * AI Vision Pipeline for KBCHRONO
 * Phase 1: Real AI Background Removal (Semantic Segmentation via WASM)
 * Phase 2: Geometric Alignment & Padding
 * Phase 3: Export to WebP/PNG
 */
export async function processImageWithAIVision(file: File, options: AIVisionOptions = {}): Promise<File> {
  const { paddingPercent = 10, outputFormat = "image/webp", outputSize = 1080 } = options;

  // 0. Hızlandırma Optimizasyonu: Fotoğrafı AI'a vermeden önce küçült
  // Eğer kullanıcı 4K veya çok büyük bir fotoğraf yüklerse AI tarayıcıda yavaşlar.
  // Bu yüzden fotoğrafı maksimum 1080px olacak şekilde yeniden boyutlandırıyoruz.
  const originalBitmap = await createImageBitmap(file);
  const maxProcessSize = 800; // Hız için 800px yeterince kalitelidir
  let preScale = 1;
  if (originalBitmap.width > maxProcessSize || originalBitmap.height > maxProcessSize) {
    preScale = Math.min(maxProcessSize / originalBitmap.width, maxProcessSize / originalBitmap.height);
  }
  
  const preCanvas = document.createElement("canvas");
  preCanvas.width = originalBitmap.width * preScale;
  preCanvas.height = originalBitmap.height * preScale;
  const preCtx = preCanvas.getContext("2d", { willReadFrequently: true });
  preCtx?.drawImage(originalBitmap, 0, 0, preCanvas.width, preCanvas.height);
  
  const optimizedBlob = await new Promise<Blob>((resolve) => {
    preCanvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
  });

  // 1. Gerçek Yapay Zeka (AI Semantic Segmentation) ile Arka Plan Silme
  // API kullanmadan tamamen lokal olarak tarayıcı içinde çalışan modeli kullanıyoruz.
  // Daha hassas nesne tespiti için küçük model yerine standart/gelişmiş isnet modeline dönüldü.
  const bgRemovedBlob = await removeBackground(optimizedBlob, {
    model: "isnet", // Daha detaylı analiz için gelişmiş model
    output: { format: "image/png" }
  });

  const img = await createImageBitmap(bgRemovedBlob);

  // 2. Kırpma (Bounding Box) Algoritması
  // Sadece imgly'nin sildiği arka plandan kalan saati kırpıyoruz. Ekstra ten rengi silici iptal edildi (saatleri bozuyordu).
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  if (!tCtx) throw new Error("Temp Canvas context not available");

  tCtx.drawImage(img, 0, 0);
  const imageData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  // Objeyi çevreleyen en dar kutuyu (bounding box) bulmak için değişkenler
  let minX = tempCanvas.width;
  let minY = tempCanvas.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < tempCanvas.height; y++) {
    for (let x = 0; x < tempCanvas.width; x++) {
      const i = (y * tempCanvas.width + x) * 4;
      const alpha = data[i + 3];

      // Yapay zekanın tam silemediği silik/hayalet pikselleri (leke gibi duran eller/kollar) tamamen temizle
      if (alpha < 80) {
        data[i + 3] = 0;
      } else {
        // Kalan net ve belirgin piksellerle (saatin kendisi) Bounding Box'ı hesapla
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Temizlenmiş (lekeleri silinmiş) resmi geçici tuvale geri yaz
  tCtx.putImageData(imageData, 0, 0);

  // Eğer her şey silindiyse (tamamen boş görsel vs), varsayılan boyutları kullan
  if (minX > maxX || minY > maxY) {
    minX = 0;
    minY = 0;
    maxX = tempCanvas.width;
    maxY = tempCanvas.height;
  }
  
  const objWidth = maxX - minX;
  const objHeight = maxY - minY;

  // 3. Final Canvas for Geometric Alignment (Vitrin Kare Standartı - 1:1)
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Canvas context is not available");
  }

  ctx.clearRect(0, 0, outputSize, outputSize);

  // Calculate scale (%10 Padding - Kullanıcının frontend ayarıyla uyumlu)
  const paddingPx = (outputSize * paddingPercent) / 100;
  const safeAreaSize = outputSize - paddingPx * 2;
  const scale = Math.min(safeAreaSize / objWidth, safeAreaSize / objHeight);
  const scaledWidth = objWidth * scale;
  const scaledHeight = objHeight * scale;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Center the object (Rotasyon kaldırıldı, resim yüklendiği gibi kalacak)
  const dx = (outputSize - scaledWidth) / 2;
  const dy = (outputSize - scaledHeight) / 2;
  
  ctx.drawImage(
    tempCanvas, 
    minX, minY, objWidth, objHeight, 
    dx, dy, scaledWidth, scaledHeight
  );

  // Export as optimized WebP or PNG-24
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), outputFormat, 0.95);
  });

  if (!blob) {
    throw new Error("Failed to process image via AI Vision Pipeline");
  }

  const originalName = file.name.split('.')[0];
  const extension = outputFormat === "image/webp" ? "webp" : "png";
  const newFileName = `${originalName}-kbchrono-ai-vision.${extension}`;

  return new File([blob], newFileName, { type: outputFormat });
}
