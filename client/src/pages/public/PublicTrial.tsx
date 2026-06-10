// BJJRats - pagina publica de aula experimental gratuita.
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'wouter';
import api from '@/lib/api';
import { toast } from 'sonner';

type TrialKind = 'academy' | 'professor';

interface PublicTrialProps {
  targetKind?: TrialKind;
}

interface TrialTarget {
  id: string;
  kind: TrialKind;
  ownerUid: string;
  name: string;
  logo?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  trialRequestsEnabled?: boolean | null;
  schedules?: { day: string; time?: string; modality?: string }[];
}

const BELT_OPTIONS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const inputStyle = {
  background: '#111',
  border: '1px solid #1E1E1E',
  color: '#FFF',
  fontFamily: 'Barlow, sans-serif',
  fontSize: '0.9rem',
  padding: '0.75rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.7rem',
  textTransform: 'uppercase' as const,
  color: '#555',
  letterSpacing: '0.05em',
};

export default function PublicTrial({ targetKind = 'academy' }: PublicTrialProps) {
  const params = useParams<{ targetId?: string; academyId?: string }>();
  const targetId = params.targetId || params.academyId || '';
  const [target, setTarget] = useState<TrialTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
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

  const copy = useMemo(() => {
    const isAcademy = targetKind === 'academy';
    return {
      missing: isAcademy ? 'ACADEMIA NAO ENCONTRADA' : 'PROFESSOR NAO ENCONTRADO',
      eyebrow: isAcademy ? 'AULA EXPERIMENTAL GRATUITA NA ACADEMIA' : 'AULA EXPERIMENTAL GRATUITA COM PROFESSOR',
      titleLine: isAcademy ? 'VENHA TREINAR' : 'AGENDE SUA AULA',
      highlight: isAcademy ? 'SEM COMPROMISSO' : 'EXPERIMENTAL',
      description: isAcademy
        ? 'Preencha o formulario e a academia entrara em contato para combinar sua primeira aula gratis.'
        : 'Preencha o formulario e o professor entrara em contato para combinar sua aula experimental gratis.',
      successText: isAcademy
        ? 'A academia'
        : 'O professor',
      targetLabel: isAcademy ? 'Academia' : 'Professor',
    };
  }, [targetKind]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!targetId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const data = await api.public.trialTarget(targetKind, targetId);
        if (!active) return;
        setTarget(data);
      } catch (err: any) {
        if (!active) return;
        if (err?.status === 403) setUnavailable(true);
        else setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [targetId, targetKind]);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) return;

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Preencha nome e telefone');
      return;
    }

    setSubmitting(true);
    try {
      await api.public.createTrialRequest({
        targetKind,
        targetUid: target.ownerUid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        belt: form.belt,
        age: form.age.trim(),
        message: form.message.trim(),
        preferredDay: form.preferredDay.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#CC0000', letterSpacing: '0.2em' }}>CARREGANDO...</p>
      </div>
    );
  }

  if (notFound || !target) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#CC0000', textAlign: 'center' }}>
          {unavailable ? 'AULA GRATIS INDISPONIVEL' : copy.missing}
        </p>
        {unavailable && (
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#777', textAlign: 'center', maxWidth: '360px', lineHeight: 1.5 }}>
            Este perfil desativou temporariamente as solicitacoes de aula experimental.
          </p>
        )}
        <Link href="/" style={{ color: '#555', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.875rem', textTransform: 'uppercase' }}>VOLTAR</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', border: '2px solid #0D9E6E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', color: '#0D9E6E' }}>OK</div>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>SOLICITACAO ENVIADA!</h1>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '1rem', color: '#888', maxWidth: '340px', lineHeight: 1.6 }}>
          {copy.successText} <strong style={{ color: '#FFF' }}>{target.name}</strong> entrara em contato em breve para confirmar sua aula experimental gratuita.
        </p>
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: '3px solid #0D9E6E', padding: '1rem', maxWidth: '340px', width: '100%', textAlign: 'left' }}>
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
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: '3rem' }}>
      <div style={{ background: '#0D0D0D', borderBottom: '2px solid #CC0000', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {target.logo ? (
          <img src={target.logo} alt={target.name} style={{ width: '44px', height: '44px', objectFit: 'cover', border: '1px solid #1E1E1E' }} />
        ) : (
          <div style={{ width: '44px', height: '44px', background: '#111', border: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, color: '#CC0000' }}>
            {target.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>{target.name}</p>
          {(target.city || target.state) && (
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#555' }}>
              {[target.city, target.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1.5rem 0 0.5rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#CC0000', marginBottom: '0.5rem' }}>{copy.eyebrow}</p>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2.5rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1, marginBottom: '0.75rem' }}>
            {copy.titleLine}<br /><span style={{ color: '#CC0000' }}>{copy.highlight}</span>
          </h1>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#666', lineHeight: 1.6 }}>{copy.description}</p>
        </div>

        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#CC0000', letterSpacing: '0.1em' }}>{copy.targetLabel}</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#FFF' }}>{target.name}</p>
          {target.address && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888' }}>{target.address}</p>}
          {target.phone && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#666' }}>Contato: {target.phone}</p>}
        </div>

        {target.schedules && target.schedules.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#CC0000', letterSpacing: '0.1em', marginBottom: '0.625rem' }}>HORARIOS DISPONIVEIS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {target.schedules.slice(0, 6).map((schedule, index) => (
                <div key={`${schedule.day}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.375rem 0', borderBottom: '1px solid #1A1A1A' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: '#CCC' }}>{schedule.day}</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', color: '#888', textAlign: 'right' }}>
                    {[schedule.time, schedule.modality].filter(Boolean).join(' - ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: '#555', letterSpacing: '0.1em' }}>SEUS DADOS</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={labelStyle}>Nome completo *</label>
            <input value={form.name} onChange={event => updateForm('name', event.target.value)} placeholder="Seu nome" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={labelStyle}>Telefone / WhatsApp *</label>
            <input value={form.phone} onChange={event => updateForm('phone', event.target.value)} placeholder="(11) 99999-9999" type="tel" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={labelStyle}>E-mail</label>
            <input value={form.email} onChange={event => updateForm('email', event.target.value)} placeholder="seu@email.com" type="email" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={labelStyle}>Faixa atual</label>
              <select value={form.belt} onChange={event => updateForm('belt', event.target.value)} style={inputStyle}>
                {BELT_OPTIONS.map(belt => <option key={belt} value={belt}>{belt}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={labelStyle}>Idade</label>
              <input value={form.age} onChange={event => updateForm('age', event.target.value)} placeholder="Ex: 28" type="number" min="5" max="99" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={labelStyle}>Dia preferido para a aula</label>
            <input value={form.preferredDay} onChange={event => updateForm('preferredDay', event.target.value)} placeholder="Ex: Segunda a noite" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={labelStyle}>Mensagem opcional</label>
            <textarea value={form.message} onChange={event => updateForm('message', event.target.value)} placeholder="Duvidas, experiencia previa, objetivos..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <button
            type="submit"
            disabled={submitting}
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
              marginTop: '0.5rem',
            }}
          >
            {submitting ? 'ENVIANDO...' : 'QUERO MINHA AULA GRATIS'}
          </button>
        </form>

        <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid #1A1A1A' }}>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#333' }}>
            Powered by <Link href="/" style={{ color: '#CC0000', textDecoration: 'none', fontWeight: 700 }}>BJJRats</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
