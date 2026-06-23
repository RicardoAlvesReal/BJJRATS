// BJJRats — Adaptador de ambiente (Web vs Capacitor nativo)
// Centraliza as diferenças entre PWA/browser e app nativo

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
