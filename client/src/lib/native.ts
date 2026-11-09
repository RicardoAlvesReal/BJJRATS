// BJJRats — Adaptador de ambiente (Web vs Capacitor nativo)
// Centraliza as diferenças entre PWA/browser e app nativo

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Abre uma URL externa no navegador do dispositivo.
 */
export async function openExternalUrl(url: string): Promise<void> {
  window.open(url, '_blank');
}

/**
 * Detecta se está rodando dentro do Capacitor (app nativo)
 */
export function isNative(): boolean {
  try {
    return !!(window as any)?.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** Converte um data URL em File de forma síncrona (preserva o gesto do usuário no Safari). */
export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/png';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], fileName, { type: mime });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function isCancel(err: unknown) {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  return (err as any)?.name === 'AbortError' || msg.includes('cancel') || msg.includes('abort');
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Compartilha uma imagem (data URL) pela folha de compartilhamento do sistema.
 * - App nativo: grava no cache e usa o plugin @capacitor/share.
 * - Web: Web Share API com arquivo; se indisponível, baixa a imagem.
 */
export async function shareImage(opts: { dataUrl: string; fileName: string; title?: string; text?: string }): Promise<ShareResult> {
  const { dataUrl, fileName, title, text } = opts;

  if (isNative() && Capacitor.isPluginAvailable('Share') && Capacitor.isPluginAvailable('Filesystem')) {
    try {
      const { uri } = await Filesystem.writeFile({
        path: fileName,
        data: dataUrl.split(',')[1],
        directory: Directory.Cache,
      });
      await Share.share({ title, text, files: [uri], dialogTitle: title });
      return 'shared';
    } catch (err) {
      if (isCancel(err)) return 'cancelled';
      console.error('[shareImage] native share failed', err);
      // segue para o caminho web
    }
  }

  const file = dataUrlToFile(dataUrl, fileName);
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (err) {
      if (isCancel(err)) return 'cancelled';
      console.error('[shareImage] web share failed', err);
    }
  }

  downloadDataUrl(dataUrl, fileName);
  return 'downloaded';
}
