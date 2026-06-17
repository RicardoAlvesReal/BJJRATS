import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';

export default function AdminAppLinks() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.admin.getSettings()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await api.admin.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} style={{ marginBottom: '1.5rem' }}>
        <h1 style={headingStyle}>Configurações do App</h1>
        <p style={mutedStyle}>
          Links de download e parâmetros de cobrança da plataforma.
        </p>
      </motion.div>

      {loading ? (
        <p style={mutedStyle}>Carregando...</p>
      ) : (
        <motion.div variants={fadeUp} className="bjj-card" style={{ padding: '1.5rem', maxWidth: '560px' }}>
          <Field label="Google Play (URL)">
            <input
              style={inputStyle}
              value={settings.play_store_url ?? ''}
              onChange={e => setField('play_store_url', e.target.value)}
              placeholder="https://play.google.com/store/apps/details?id=..."
            />
          </Field>

          <Field label="App Store (URL)">
            <input
              style={inputStyle}
              value={settings.app_store_url ?? ''}
              onChange={e => setField('app_store_url', e.target.value)}
              placeholder="https://apps.apple.com/app/id..."
            />
          </Field>

          <div style={{ borderTop: '1px solid #222', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <p style={{ ...mutedStyle, marginBottom: '0.75rem' }}>Cobrança</p>

            <Field label="Tolerância de inadimplência (dias)">
              <input
                style={inputStyle}
                type="number"
                min="0"
                max="30"
                value={settings.past_due_grace_days ?? '3'}
                onChange={e => {
                  const v = Math.max(0, Math.min(30, parseInt(e.target.value) || 0));
                  setField('past_due_grace_days', String(v));
                }}
                placeholder="3"
              />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', display: 'block', marginTop: '0.25rem' }}>
                Dias que o usuário pode continuar usando o app após o vencimento antes de ser bloqueado.
              </span>
            </Field>
          </div>

          {error && <p style={{ color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
            <button onClick={handleSave} style={btnPrimaryStyle} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {saved && <span style={{ color: '#22C55E', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem' }}>Salvo!</span>}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 800,
  fontSize: '1.5rem',
  color: '#FFF',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  margin: 0,
};

const mutedStyle: React.CSSProperties = {
  color: '#555',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.9rem',
  marginTop: '0.25rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1A1A1A',
  border: '1px solid #333',
  color: '#FFF',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.9rem',
  padding: '0.55rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnPrimaryStyle: React.CSSProperties = {
  background: '#CC0000',
  color: '#FFF',
  border: 'none',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 800,
  fontSize: '0.85rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '0.6rem 1.25rem',
  cursor: 'pointer',
};
