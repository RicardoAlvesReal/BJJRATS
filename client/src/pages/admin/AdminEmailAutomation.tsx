import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api, { type CompanyEmailSettings } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';

function isEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim());
}

export default function AdminEmailAutomation() {
  const [settings, setSettings] = useState<CompanyEmailSettings | null>(null);
  const [draft, setDraft] = useState({
    enabled: true,
    from: '',
    resendApiKey: '',
    clearResendApiKey: false,
  });
  const [testTo, setTestTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = () => {
    setLoading(true);
    api.admin.emailAutomation.get()
      .then((config) => {
        setSettings(config);
        setDraft({
          enabled: config.enabled,
          from: config.from || '',
          resendApiKey: '',
          clearResendApiKey: false,
        });
      })
      .catch((error) => {
        console.error(error);
        toast.error('Erro ao carregar automacao de e-mail');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    const from = draft.from.trim();
    if (!from) {
      toast.error('Informe o e-mail do remetente');
      return;
    }
    if (!isEmail(from)) {
      toast.error('Use apenas o e-mail do remetente, sem nome ou sinais <>');
      return;
    }

    const hasResendKey = Boolean(draft.resendApiKey.trim()) || Boolean(settings?.hasResendApiKey && !draft.clearResendApiKey);
    if (draft.enabled && !hasResendKey) {
      toast.error('Informe a chave da API Resend antes de ativar os envios');
      return;
    }

    setSaving(true);
    try {
      const config = await api.admin.emailAutomation.update({
        enabled: draft.enabled,
        provider: 'resend',
        from,
        resendApiKey: draft.resendApiKey.trim() || undefined,
        clearResendApiKey: draft.clearResendApiKey,
      });
      setSettings(config);
      setDraft(prev => ({
        ...prev,
        resendApiKey: '',
        clearResendApiKey: false,
      }));
      toast.success('Automacao de e-mail salva');
    } catch (error: any) {
      toast.error(error?.body?.error || error?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (draft.resendApiKey.trim() || draft.clearResendApiKey) {
      toast.error('Salve a configuracao antes de enviar o teste');
      return;
    }

    setTesting(true);
    try {
      const result = await api.admin.emailAutomation.test(testTo.trim() || undefined);
      toast.success(result.provider === 'log' ? 'Teste registrado no servidor' : 'Teste enviado');
    } catch (error: any) {
      toast.error(error?.body?.error || error?.message || 'Erro ao testar envio');
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} style={headerStyle}>
        <div>
          <h1 style={headingStyle}>Email da Automacao</h1>
          <p style={mutedStyle}>E-mail oficial usado nas mensagens automaticas da plataforma.</p>
        </div>
        <StatusBadge enabled={draft.enabled} configured={Boolean(settings?.hasResendApiKey && !draft.clearResendApiKey) || Boolean(draft.resendApiKey.trim())} />
      </motion.div>

      {loading ? (
        <p style={mutedStyle}>Carregando...</p>
      ) : (
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] gap-4">
          <section className="bjj-card" style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>Controle</h2>
              <label style={switchStyle}>
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={event => setDraft(prev => ({ ...prev, enabled: event.target.checked }))}
                  style={{ display: 'none' }}
                />
                <span style={{
                  ...switchTrackStyle,
                  background: draft.enabled ? '#0D9E6E' : '#333',
                }}>
                  <span style={{
                    ...switchThumbStyle,
                    transform: draft.enabled ? 'translateX(18px)' : 'translateX(0)',
                  }} />
                </span>
              </label>
            </div>

            <Field label="E-mail do remetente">
              <input
                value={draft.from}
                onChange={event => setDraft(prev => ({ ...prev, from: event.target.value }))}
                placeholder="no-reply@thebjjrats.com"
                type="email"
                style={inputStyle}
              />
            </Field>

            <Field label="Chave da API Resend">
              <input
                value={draft.resendApiKey}
                onChange={event => setDraft(prev => ({ ...prev, resendApiKey: event.target.value, clearResendApiKey: false }))}
                placeholder={settings?.hasResendApiKey ? `Configurada: ****${settings.resendApiKeyLast4}` : 're_...'}
                type="password"
                style={inputStyle}
              />
              {settings?.hasResendApiKey && (
                <button
                  type="button"
                  onClick={() => setDraft(prev => ({ ...prev, clearResendApiKey: !prev.clearResendApiKey, resendApiKey: '' }))}
                  style={{ ...linkButtonStyle, color: draft.clearResendApiKey ? '#CC0000' : '#888' }}
                >
                  {draft.clearResendApiKey ? 'Cancelar limpeza da chave' : 'Remover chave salva'}
                </button>
              )}
            </Field>

            <button onClick={save} disabled={saving} style={{ ...btnPrimaryStyle, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Salvando...' : 'Salvar automacao'}
            </button>
          </section>

          <aside className="bjj-card" style={cardStyle}>
            <h2 style={sectionTitleStyle}>Teste</h2>
            <Field label="Enviar para">
              <input
                value={testTo}
                onChange={event => setTestTo(event.target.value)}
                placeholder="vazio usa seu e-mail"
                type="email"
                style={inputStyle}
              />
            </Field>
            <button onClick={test} disabled={testing || saving} style={{ ...btnSecondaryStyle, opacity: testing ? 0.6 : 1 }}>
              {testing ? 'Enviando...' : 'Enviar teste'}
            </button>

            <div style={summaryStyle}>
              <SummaryLine label="Status" value={draft.enabled ? 'Ativo' : 'Desligado'} color={draft.enabled ? '#22C55E' : '#777'} />
              <SummaryLine label="Remetente" value={draft.from || 'Nao definido'} />
              <SummaryLine label="Chave Resend" value={settings?.hasResendApiKey ? `****${settings.resendApiKeyLast4}` : 'Nao configurada'} />
            </div>
          </aside>
        </motion.div>
      )}
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ enabled, configured }: { enabled: boolean; configured: boolean }) {
  const active = enabled && configured;
  const pending = enabled && !configured;

  return (
    <span style={{
      background: active ? '#0D9E6E22' : pending ? '#F59E0B22' : '#333',
      border: `1px solid ${active ? '#0D9E6E' : pending ? '#F59E0B' : '#444'}`,
      color: active ? '#A7F3D0' : pending ? '#FCD34D' : '#999',
      fontFamily: 'Barlow Condensed, sans-serif',
      fontWeight: 900,
      fontSize: '0.72rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '0.45rem 0.7rem',
      whiteSpace: 'nowrap',
    }}>
      {active ? 'Ativo' : pending ? 'Pendente' : 'Desligado'}
    </span>
  );
}

function SummaryLine({ label, value, color = '#AAA' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #1F1F1F', padding: '0.65rem 0' }}>
      <span style={{ ...mutedStyle, margin: 0 }}>{label}</span>
      <span style={{ color, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.8rem', textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '1.25rem',
  flexWrap: 'wrap',
};

const cardStyle: React.CSSProperties = {
  padding: '1.25rem',
  borderRadius: '8px',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '1rem',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 900,
  fontSize: '1.55rem',
  color: '#FFF',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: 0,
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 900,
  fontSize: '1rem',
  color: '#FFF',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: 0,
};

const mutedStyle: React.CSSProperties = {
  color: '#666',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.86rem',
  marginTop: '0.25rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#888',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 800,
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0A0A0A',
  border: '1px solid #2A2A2A',
  color: '#FFF',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.9rem',
  padding: '0.65rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const switchStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
};

const switchTrackStyle: React.CSSProperties = {
  width: '42px',
  height: '24px',
  borderRadius: '999px',
  padding: '3px',
  display: 'inline-flex',
  alignItems: 'center',
  transition: 'background 160ms ease',
};

const switchThumbStyle: React.CSSProperties = {
  width: '18px',
  height: '18px',
  borderRadius: '999px',
  background: '#FFF',
  display: 'block',
  transition: 'transform 160ms ease',
};

const btnPrimaryStyle: React.CSSProperties = {
  width: '100%',
  background: '#CC0000',
  color: '#FFF',
  border: 'none',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 900,
  fontSize: '0.85rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '0.75rem 1rem',
  cursor: 'pointer',
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnPrimaryStyle,
  background: '#111',
  border: '1px solid #333',
};

const linkButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '0.45rem 0 0',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 800,
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const summaryStyle: React.CSSProperties = {
  marginTop: '1.25rem',
  borderTop: '1px solid #1F1F1F',
};
