// BJJRats — WhatsApp da Academia
// Mesma lógica do ProfessorPanel, adaptada para o painel da academia

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { FONTS } from '@/lib/design';

const ATTEMPT_TIMEOUT_MS = 10 * 60 * 1000;

function formatAttemptRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function AcademiaWhatsapp() {
  const [status, setStatus] = useState<{ connected: boolean; instance: { id: string; status: string; phone?: string | null } | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [attemptExpired, setAttemptExpired] = useState(false);
  const [attemptStartedAt, setAttemptStartedAt] = useState<number | null>(null);
  const [attemptTimeoutMs, setAttemptTimeoutMs] = useState(ATTEMPT_TIMEOUT_MS);
  const [attemptRemainingMs, setAttemptRemainingMs] = useState(ATTEMPT_TIMEOUT_MS);

  const expireAttempt = useCallback((showToast = true) => {
    setStatus({ connected: false, instance: null });
    setQrcode(null);
    setQrCodeText(null);
    setPolling(false);
    setConnecting(false);
    setAttemptExpired(true);
    setAttemptStartedAt(null);
    setAttemptRemainingMs(0);
    if (showToast) toast.error('Tentativa expirada. Gere uma nova conexão.');
  }, []);

  const loadStatus = useCallback(async () => {
    if (polling) return;
    try {
      const res = await api.whatsapp.status();
      setAttemptTimeoutMs(res.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS);
      if (res.expired) { expireAttempt(false); return; }
      setStatus(res);
      setQrcode(null);
      setQrCodeText(null);
      setAttemptExpired(false);
      setAttemptStartedAt(null);
    } catch {
      // Servidor offline ou Evolution API indisponível
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [expireAttempt, polling]);

  useEffect(() => {
    loadStatus();
    const onFocus = () => { if (!polling) loadStatus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !polling) loadStatus();
    });
    return () => window.removeEventListener('focus', onFocus);
  }, [loadStatus, polling]);

  useEffect(() => {
    if (!polling || !attemptStartedAt) return;
    const tick = () => setAttemptRemainingMs(Math.max(0, attemptStartedAt + attemptTimeoutMs - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attemptStartedAt, attemptTimeoutMs, polling]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.whatsapp.status();
        setAttemptTimeoutMs(res.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS);
        if (res.expired) { expireAttempt(); return; }
        if (res.connected) {
          setStatus(res);
          setQrcode(null);
          setQrCodeText(null);
          setPolling(false);
          setConnecting(false);
          setAttemptExpired(false);
          setAttemptStartedAt(null);
          toast.success('WhatsApp conectado!');
          return;
        }
      } catch { /* polling silencioso */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [expireAttempt, polling]);

  const handleConnect = async () => {
    setConnecting(true);
    setAttemptExpired(false);
    setPolling(true); // ⚡ Antes da API para evitar que loadStatus limpe o QR
    try {
      const res = await api.whatsapp.connect();
      setQrcode(res.qrcode ?? null);
      setQrCodeText(res.qrCodeText ?? null);
      const timeoutMs = res.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS;
      setAttemptTimeoutMs(timeoutMs);
      setAttemptStartedAt(Date.now());
      setAttemptRemainingMs(timeoutMs);
      if (!res.qrcode) toast.error('A Evolution API criou a instância, mas não retornou QR Code.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao conectar WhatsApp');
      setConnecting(false);
      setPolling(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    try {
      await api.whatsapp.disconnect();
      setStatus({ connected: false, instance: null });
      setQrcode(null);
      setQrCodeText(null);
      setPolling(false);
      setAttemptExpired(false);
      setAttemptStartedAt(null);
      toast.success('WhatsApp desconectado');
    } catch { toast.error('Erro ao desconectar'); }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #333', borderTopColor: '#25D366', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: FONTS.condensed, fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>CARREGANDO...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF', margin: 0 }}>📱 WHATSAPP</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>
          Conecte o WhatsApp da academia para enviar mensagens automáticas aos alunos
        </p>
      </div>

      {status?.connected ? (
        <div style={{ background: '#0A1A0A', border: '1px solid #1A4A1A', borderLeft: '3px solid #25D366', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1rem', color: '#25D366', textTransform: 'uppercase', margin: 0 }}>✅ CONECTADO</p>
              {status.instance?.phone && (
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>{status.instance.phone}</p>
              )}
            </div>
            <button onClick={handleDisconnect}
              style={{ background: 'transparent', border: '1px solid #CC0000', color: '#CC0000', fontFamily: FONTS.condensed, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
              DESCONECTAR
            </button>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#111', border: '1px solid #222' }}>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', margin: 0, lineHeight: 1.5 }}>
              As mensagens de cobrança, suspensão e lembretes serão enviadas automaticamente pelo WhatsApp da academia.
            </p>
          </div>
        </div>
      ) : attemptExpired ? (
        <div style={{ background: '#180F06', border: '1px solid #5A2F08', borderLeft: '3px solid #F59E0B', padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1rem', color: '#F59E0B', textTransform: 'uppercase', margin: 0 }}>TENTATIVA EXPIRADA</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#A98758', marginTop: '0.5rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            A instância anterior foi removida por segurança. Reinicie a tentativa para gerar um novo QR Code.
          </p>
          <button onClick={handleConnect} disabled={connecting}
            style={{ background: '#F59E0B', border: 'none', color: '#111', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.75rem 1.25rem', cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.65 : 1, width: '100%' }}>
            {connecting ? 'RESETANDO...' : 'RESETAR TENTATIVA'}
          </button>
        </div>
      ) : qrcode || qrCodeText ? (
        <div style={{ background: '#111', border: '1px solid #222', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase', marginBottom: '1rem' }}>ESCANEIE O QR CODE</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#888', marginBottom: '1rem' }}>Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
          {qrcode ? (
            <img src={qrcode} alt="QR Code" style={{ maxWidth: 280, width: '100%', border: '4px solid #FFF', borderRadius: 8 }} />
          ) : (
            <div style={{ background: '#1A1A1A', border: '1px solid #333', padding: '1rem', color: '#888', fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem' }}>
              QR Code indisponível. Reinicie a tentativa para gerar um novo QR Code.
            </div>
          )}
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: attemptRemainingMs <= 30000 ? '#F59E0B' : '#555', marginTop: '1rem' }}>
            Aguardando conexão... Tempo restante: {formatAttemptRemaining(attemptRemainingMs)}
          </p>
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #222', borderLeft: '3px solid #555', padding: '1.25rem' }}>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1rem', color: '#888', textTransform: 'uppercase', margin: 0 }}>DESCONECTADO</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555', marginTop: '0.5rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            Conecte o WhatsApp da academia para enviar mensagens automáticas de cobrança, suspensão e lembretes aos alunos.
          </p>
          <button onClick={handleConnect} disabled={connecting}
            style={{ background: '#25D366', border: 'none', color: '#FFF', fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.75rem 1.25rem', cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.6 : 1, width: '100%' }}>
            {connecting ? 'CONECTANDO...' : '📱 CONECTAR WHATSAPP'}
          </button>
        </div>
      )}

      <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', padding: '1rem' }}>
        <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>COMO FUNCIONA</p>
        <ul style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#666', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
          <li>A academia conecta seu próprio WhatsApp</li>
          <li>Mensagens são enviadas do número da academia</li>
          <li>Cobranças, suspensões e lembretes automáticos</li>
          <li>Notificações de matrícula e reativação</li>
          <li>Sem custo por mensagem</li>
        </ul>
      </div>
    </div>
  );
}
