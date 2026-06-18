// BJJRats — Adaptador de ambiente (Web vs Capacitor nativo)
// Centraliza as diferenças entre PWA/browser e app nativo

/**
 * Abre uma URL externa no navegador do dispositivo.
 * No Capacitor usa o plugin Browser (abre in-app).
 * Na web usa window.open (nova aba).
 */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    // Tenta usar Capacitor Browser (app nativo)
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } catch {
    // Fallback: navegador web
    window.open(url, '_blank');
  }
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
