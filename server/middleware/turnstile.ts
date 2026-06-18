// BJJRats — Cloudflare Turnstile validation middleware

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: TURNSTILE_SECRET, response: token }),
    });
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch {
    // Se a API do Turnstile estiver offline, permite por segurança
    return true;
  }
}

export function requireTurnstile(enabled = true) {
  return async (req: any, res: any) => {
    if (!enabled) return;

    const token = req.body?.turnstileToken;
    if (!token) {
      res.status(400).json({ error: 'Verificação de segurança necessária (turnstileToken)' });
      return;
    }

    const valid = await verifyTurnstile(token);
    if (!valid) {
      res.status(400).json({ error: 'Falha na verificação de segurança. Recarregue a página e tente novamente.' });
      return;
    }
  };
}
