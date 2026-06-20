// BJJRats PWA — AvisosTab (extracted from ProfessorPanel)
import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { getWhatsAppAutomationToast } from './utils';

export default function AvisosTab({ user, profile, accentColor }: { user: any; profile: any; accentColor: string }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', audience: 'all', urgent: false });

  const isAcademy = profile?.role === 'academy' || profile?.role === 'admin' || profile?.isAcademyAdmin;
  const audienceOptions = isAcademy
    ? [
      { value: 'all', label: 'ALUNOS E PROFESSORES' },
      { value: 'students', label: 'ALUNOS' },
      { value: 'professors', label: 'PROFESSORES' },
    ]
    : [
      { value: 'students', label: 'MEUS ALUNOS' },
    ];

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.announcements.mine();
      setAnnouncements(rows);
    } catch {
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const saveAnnouncement = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const created = await api.announcements.create({
        title: form.title.trim(),
        content: form.content.trim(),
        audience: isAcademy ? form.audience : 'students',
        urgent: form.urgent,
      });
      setForm({ title: '', content: '', audience: 'all', urgent: false });
      await loadAnnouncements();
      toast.success(getWhatsAppAutomationToast(created.whatsapp));
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar notificação');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (announcement: any) => {
    try {
      await api.announcements.update(announcement.id, { isActive: !announcement.isActive });
      await loadAnnouncements();
    } catch {
      toast.error('Erro ao alterar notificação');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Excluir esta notificação?')) return;
    try {
      await api.announcements.delete(id);
      setAnnouncements(prev => prev.filter(item => item.id !== id));
    } catch {
      toast.error('Erro ao excluir notificação');
    }
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ background: '#111', border: `1px solid ${accentColor}`, borderLeft: `3px solid ${accentColor}`, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            NOVA NOTIFICAÇÃO
          </p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
            {isAcademy ? (profile?.academyName || 'ACADEMIA') : (profile?.name || user?.name || 'PROFESSOR')}
          </p>
        </div>

        <input
          value={form.title}
          onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Título da notificação"
          style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
        />

        <textarea
          value={form.content}
          onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
          placeholder="Mensagem para enviar no sininho dos alunos..."
          rows={4}
          style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {audienceOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, audience: option.value }))}
              style={{
                background: form.audience === option.value ? accentColor : '#1A1A1A',
                border: `1px solid ${form.audience === option.value ? accentColor : '#333'}`,
                color: form.audience === option.value ? '#FFF' : '#666',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 900,
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.45rem 0.65rem',
                cursor: 'pointer',
              }}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, urgent: !prev.urgent }))}
            style={{
              background: form.urgent ? '#1A0000' : '#1A1A1A',
              border: `1px solid ${form.urgent ? '#CC0000' : '#333'}`,
              color: form.urgent ? '#FF4D4D' : '#666',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 900,
              fontSize: '0.68rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0.45rem 0.65rem',
              cursor: 'pointer',
            }}
          >
            URGENTE
          </button>
        </div>

        <button
          onClick={saveAnnouncement}
          disabled={saving || !form.title.trim() || !form.content.trim()}
          style={{ background: saving || !form.title.trim() || !form.content.trim() ? '#333' : accentColor, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer', width: '100%' }}
        >
          {saving ? 'ENVIANDO...' : 'ENVIAR NOTIFICAÇÃO'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          NOTIFICAÇÕES ENVIADAS
        </p>
        <button
          type="button"
          onClick={loadAnnouncements}
          disabled={loading}
          style={{ background: '#111', border: '1px solid #2A2A2A', color: loading ? '#444' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.75rem', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}
        >
          {loading ? '...' : 'ATUALIZAR'}
        </button>
      </div>

      {loading && <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>}
      {!loading && announcements.length === 0 && (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '2rem 1rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#555', textTransform: 'uppercase' }}>NENHUMA NOTIFICAÇÃO ENVIADA</p>
        </div>
      )}

      {!loading && announcements.map(announcement => (
        <div key={announcement.id} style={{ background: announcement.urgent ? '#190A0A' : '#111', border: `1px solid ${announcement.urgent ? '#CC000044' : '#1E1E1E'}`, borderLeft: `3px solid ${announcement.urgent ? '#CC0000' : accentColor}`, padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1 }}>{announcement.title}</p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#888', lineHeight: 1.45, marginTop: '0.35rem' }}>{announcement.content}</p>
            </div>
            <span style={{ flexShrink: 0, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.62rem', color: announcement.isActive === false ? '#555' : '#0D9E6E', textTransform: 'uppercase', border: `1px solid ${announcement.isActive === false ? '#333' : '#0D9E6E55'}`, padding: '0.15rem 0.45rem' }}>
              {announcement.isActive === false ? 'INATIVO' : 'ATIVO'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.62rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid #252525', padding: '0.2rem 0.45rem' }}>
              {(announcement.audience || 'all').toUpperCase()}
            </span>
            {announcement.urgent && (
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.62rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid #CC000044', padding: '0.2rem 0.45rem' }}>
                URGENTE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => toggleActive(announcement)}
              style={{ flex: 1, background: '#151515', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.68rem', textTransform: 'uppercase', padding: '0.5rem', cursor: 'pointer' }}
            >
              {announcement.isActive === false ? 'REATIVAR' : 'DESATIVAR'}
            </button>
            <button
              onClick={() => deleteAnnouncement(announcement.id)}
              style={{ background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.68rem', textTransform: 'uppercase', padding: '0.5rem 0.75rem', cursor: 'pointer' }}
            >
              EXCLUIR
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
