/**
 * BJJRats — Utilitário de Compressão de Imagens no Cliente
 * Reduz fotos pesadas (ex: 5MB - 15MB de câmeras modernas) para ~200KB - 400KB
 * antes de enviar pela rede, economizando banda, dados do usuário e espaço no servidor.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Se não for imagem ou for GIF animado/SVG, não altera
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  // Se já for menor que 300KB, pode enviar direto
  if (file.size <= 300 * 1024) {
    return file;
  }

  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    mimeType = 'image/webp',
  } = options;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        resolve(file);
        return;
      }

      // Calcula redução proporcional respeitando as dimensões máximas
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Renderiza com suavização de alta qualidade
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Tenta exportar em WebP, com fallback para JPEG se não suportado
      const targetMime = canvas.toDataURL(mimeType).startsWith(`data:${mimeType}`)
        ? mimeType
        : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Se por algum motivo a compressão não reduzir o tamanho, mantém o original
            resolve(file);
            return;
          }

          const extension = targetMime === 'image/webp' ? '.webp' : '.jpg';
          const newName = file.name.replace(/\.[^/.]+$/, '') + extension;

          const compressedFile = new File([blob], newName, {
            type: targetMime,
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        targetMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
