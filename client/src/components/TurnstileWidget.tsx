// BJJRats — Cloudflare Turnstile component

import { useEffect, useRef, useCallback } from 'react';

interface Props {
  onSuccess: (token: string) => void;
  onError?: () => void;
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'; // test key

export default function TurnstileWidget({ onSuccess, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cbRef = useRef({ onSuccess, onError });
  cbRef.current = { onSuccess, onError };

  const render = useCallback(() => {
    if (!ref.current || !(window as any).turnstile) {
      const t = setTimeout(() => render(), 200);
      return () => clearTimeout(t);
    }
    if (widgetId.current) {
      (window as any).turnstile.remove(widgetId.current);
    }
    widgetId.current = (window as any).turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => cbRef.current.onSuccess(token),
      'error-callback': () => cbRef.current.onError?.(),
      theme: 'dark',
      size: 'normal',
    });
    return () => {};
  }, []);

  useEffect(() => {
    const cleanup = render();
    return () => {
      if (widgetId.current && (window as any).turnstile) {
        (window as any).turnstile.remove(widgetId.current);
      }
      if (typeof cleanup === 'function') cleanup();
    };
  }, [render]);

  return <div ref={ref} style={{ minHeight: '65px' }} />;
}
