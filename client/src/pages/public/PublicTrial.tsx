// BJJRats — Página pública de Aula Experimental (Trial)
// Design: "Cage Fighter" — Brutalismo Tático
import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import api from '@/lib/api';
import { toast } from 'sonner';

interface AcademyInfo {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  ownerUid: string;
  schedules?: { day: string; time: string; modality?: string }[];
}

const BELT_OPTIONS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

export default function PublicTrial() {
  const params = useParams<{ academyId: string }>();
  const [academy, setAcademy] = useState<AcademyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    belt: 'Branca',
    age: '',
    message: '',
    preferredDay: '',
  });
  const [waiverText, setWaiverText] = useState('');
  const [waiverAccepted, setWaiverAccepted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api.users.get(params.academyId);
        if (d) {
          setAcademy({
            id: params.academyId,
            name: d.academyName || d.name || 'Academia',
            logo: d.academyLogo || d.photo,
            address: d.address,
            city: d.city,
            state: d.state,
            phone: d.phone,
            ownerUid: params.academyId,
            schedules: (d as any).schedules || [],
          });
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.academyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Preencha nome e telefone');
      return;
    }
    if (waiverText && !waiverAccepted) {
      toast.error('Você precisa aceitar os termos para continuar');
      return;
    }
    if (!academy) return;
    setSubmitting(true);
    try {
      await api.academyRequests.create({
        professorUid: academy.ownerUid,
        academyId: params.academyId,
        academyName: academy.name,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        belt: form.belt,
        age: form.age.trim(),
        message: form.message.trim(),
        preferredDay: form.preferredDay.trim(),
        type: 'trial',
        status: 'pending',
      });
      await api.notifications.create({
        toUid: academy.ownerUid,
        type: 'trial_request',
        title: '🎯 NOVO LEAD — AULA EXPERIMENTAL',
        message: `${form.name} quer fazer uma aula experimental! Faixa: ${form.belt}. Tel: ${form.phone}`,
      });
      setSubmitted(true);
    } catch {
      toast.error('Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#CC0000', letterSpacing: '0.2em' }}>CARREGANDO...</p>
    </div>
  );

  if (notFound || !academy) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#CC0000' }}>ACADEMIA NÃO ENCONTRADA</p>
      <Link href="/" style={{ color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.875rem', textTransform: 'uppercase' }}>← VOLTAR</Link>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem' }}>🥋</div>
      <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>SOLICITAÇÃO ENVIADA!</h1>
      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '1rem', color: '#888', maxWidth: '320px', lineHeight: 1.6 }}>
        A academia <strong style={{ color: '#FFF' }}>{academy.name}</strong> entrará em contato em breve para confirmar sua aula experimental gratuita.
      </p>
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: '3px solid #0D9E6E', padding: '1rem', maxWidth: '320px', width: '100%', textAlign: 'left' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#0D9E6E', marginBottom: '0.5rem' }}>SEUS DADOS</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#CCC' }}>{form.name}</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#888' }}>{form.phone}</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#888' }}>Faixa: {form.belt}</p>
      </div>
      <Link href="/" style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem 2rem', textDecoration: 'none', display: 'inline-block' }}>
        CONHECER O BJJRATS
      </Link>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ background: '#0D0D0D', borderBottom: '2px solid #CC0000', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {academy.logo && (
          <img src={academy.logo} alt={academy.name} style={{ width: '40px', height: '40px', objectFit: 'cover', border: '1px solid #1E1E1E' }} />
        )}
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>{academy.name}</p>
          {(academy.city || academy.state) && (
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555' }}>
              📍 {[academy.city, academy.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '1.5rem 0 0.5rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#CC0000', marginBottom: '0.5rem' }}>AULA EXPERIMENTAL GRATUITA</p>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2.5rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1, marginBottom: '0.75rem' }}>
            VENHA TREINAR<br /><span style={{ color: '#CC0000' }}>SEM COMPROMISSO</span>
          </h1>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#666', lineHeight: 1.6 }}>
            Preencha o formulário e a academia entrará em contato para agendar sua primeira aula grátis.
          </p>
        </div>

        {/* Horários */}
        {academy.schedules && academy.schedules.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#CC0000', letterSpacing: '0.1em', marginBottom: '0.625rem' }}>HORÁRIOS DE TREINO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {academy.schedules.slice(0, 6).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid #1A1A1A' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#CCC' }}>{s.day}</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#888' }}>{s.time}{s.modality ? ` · ${s.modality}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.1em' }}>SEUS DADOS</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>Nome completo *</label>
            <input
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Seu nome"
              style={{ background: '#111', border: '1px solid #1E1E1E', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', padding: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>Telefone / WhatsApp *</label>
            <input
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="(11) 99999-9999"
              type="tel"
              style={{ background: '#111', border: '1px solid #1E1E1E', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', padding: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>E-mail</label>
            <input
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="seu@email.com"
              type="email"
              style={{ background: '#111', border: '1px solid #1E1E1E', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', padding: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>Faixa atual</label>
              <select
                value={form.belt} onChange={e => setForm(f => ({ ...f, belt: e.target.value }))}
                style={{ background: '#111', border: '1px solid #1E1E1E', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              >
                {BELT_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>Idade</label>
              <input
                value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                placeholder="Ex: 28"
                type="number"
                min="5" max="99"
                style={{ background: '#111', border: '1px solid #1E1E1E', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', padding: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>Dia preferido para a aula</label>
            <input
              value={form.preferredDay} onChange={e => setForm(f => ({ ...f, preferredDay: e.target.value }))}
              placeholder="Ex: Segunda ou Quarta à noite"
              style={{ background: '#111', border: '1px solid #1E1E1E', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', padding: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>Mensagem (opcional)</label>
            <textarea
              value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Dúvidas, experiência prévia, etc."
              rows={3}
              style={{ background: '#111', border: '1px solid #1E1E1E', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Waiver */}
          {waiverText && (
            <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: '#888', margin: 0 }}>📄 TERMOS E CONDIÇÕES</p>
              <div style={{ maxHeight: '100px', overflowY: 'auto', fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#666', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {waiverText}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={waiverAccepted}
                  onChange={e => setWaiverAccepted(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#CC0000', cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#AAA' }}>Li e aceito os termos e condições acima</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (!!waiverText && !waiverAccepted)}
            style={{
              background: submitting ? '#330000' : '#CC0000',
              border: 'none',
              color: '#FFF',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 900,
              fontSize: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '1rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              marginTop: '0.5rem',
            }}
          >
            {submitting ? 'ENVIANDO...' : '🥋 QUERO MINHA AULA GRÁTIS'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid #1A1A1A' }}>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#333' }}>
            Powered by{' '}
            <Link href="/" style={{ color: '#CC0000', textDecoration: 'none', fontWeight: 700 }}>BJJRats</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
