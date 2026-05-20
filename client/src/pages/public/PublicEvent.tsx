// Design: "Cage Fighter" — Brutalismo Tático
// Página pública de Evento — compartilhável via WhatsApp/Instagram
import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  description?: string;
  type: string;
  date: string;
  time?: string;
  location?: string;
  slots?: number;
  price?: string;
  academyName: string;
  academyLogo?: string;
  authorUid: string;
  registrations: string[];
  createdAtStr?: string;
}

const TYPE_LABELS: Record<string, string> = {
  competicao: '🏆 COMPETIÇÃO',
  seminario: '📚 SEMINÁRIO',
  aula_especial: '⭐ AULA ESPECIAL',
  confraternizacao: '🎉 CONFRATERNIZAÇÃO',
  outro: '📅 EVENTO',
};

export default function PublicEvent() {
  const params = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [registering, setRegistering] = useState(false);

  const loadEvent = async () => {
    try {
      const d = await api.events.get(params.eventId);
      const ev: Event = {
        id: d.id,
        title: d.title || 'Evento',
        description: d.description,
        type: d.type || 'outro',
        date: d.date || '',
        time: d.time,
        location: d.location,
        slots: d.slots,
        price: d.price,
        academyName: d.academyName || 'Academia',
        academyLogo: d.academyLogo,
        authorUid: d.authorUid,
        registrations: d.registrations || [],
        createdAtStr: d.createdAtStr,
      };
      setEvent(ev);
      document.title = `${ev.title} — ${ev.academyName}`;
      const setMeta = (prop: string, content: string) => {
        let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement;
        if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
        el.setAttribute('content', content);
      };
      setMeta('og:title', `${ev.title} — ${ev.academyName}`);
      setMeta('og:description', `${TYPE_LABELS[ev.type] || 'Evento'} · ${ev.date}${ev.location ? ` · ${ev.location}` : ''}`);
      if (ev.academyLogo) setMeta('og:image', ev.academyLogo);
      setMeta('og:url', window.location.href);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadEvent(); }, [params.eventId]);

  const handleRegister = async () => {
    if (!user) { window.location.href = '/login'; return; }
    if (!event) return;
    setRegistering(true);
    try {
      const updated = [...(event.registrations || []), user.uid];
      await api.events.update(event.id, { registrations: updated });
      toast.success('Inscrição confirmada!');
      await loadEvent();
    } catch { toast.error('Erro ao se inscrever'); }
    finally { setRegistering(false); }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: event?.title, text: `${event?.title} — ${event?.academyName}`, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem' }}>CARREGANDO...</p>
    </div>
  );

  if (notFound || !event) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</p>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF' }}>EVENTO NÃO ENCONTRADO</p>
      <Link href="/app" style={{ marginTop: '1.5rem', background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem 1.5rem', textDecoration: 'none', display: 'inline-block' }}>
        ABRIR O APP
      </Link>
    </div>
  );

  const isRegistered = user ? event.registrations.includes(user.uid) : false;
  const isFull = event.slots ? event.registrations.length >= event.slots : false;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ background: '#111', borderBottom: '2px solid #CC0000', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        {event.academyLogo
          ? <img src={event.academyLogo} alt="logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          : <div style={{ width: '40px', height: '40px', background: '#1A0000', border: '1px solid #CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🏫</div>}
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>{event.academyName}</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.125rem' }}>THE BJJRATS</p>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Type badge */}
        <span style={{ background: '#1A0000', border: '1px solid #CC0000', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.25rem 0.625rem', alignSelf: 'flex-start' }}>
          {TYPE_LABELS[event.type] || '📅 EVENTO'}
        </span>

        {/* Title */}
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em', lineHeight: 1.1 }}>{event.title}</h1>

        {/* Details */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { icon: '📅', label: 'DATA', value: `${event.date}${event.time ? ` às ${event.time}` : ''}` },
            event.location && { icon: '📍', label: 'LOCAL', value: event.location },
            event.slots && { icon: '👥', label: 'VAGAS', value: `${event.registrations.length}/${event.slots} inscritos` },
            event.price && { icon: '💰', label: 'VALOR', value: event.price },
          ].filter(Boolean).map((item: any) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.1rem' }}>{item.icon}</span>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#FFFFFF', marginTop: '0.125rem' }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        {event.description && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1.25rem' }}>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#CCC', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.description}</p>
          </div>
        )}

        {/* Inscrição */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {isRegistered ? (
            <div style={{ background: '#001A00', border: '1px solid #00AA00', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#00AA00' }}>✅ VOCÊ ESTÁ INSCRITO</p>
            </div>
          ) : isFull ? (
            <div style={{ background: '#1A0000', border: '1px solid #CC0000', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#CC0000' }}>VAGAS ESGOTADAS</p>
            </div>
          ) : (
            <button onClick={handleRegister} disabled={registering} style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', border: 'none', cursor: registering ? 'not-allowed' : 'pointer', opacity: registering ? 0.7 : 1 }}>
              {registering ? 'INSCREVENDO...' : '🥋 QUERO ME INSCREVER'}
            </button>
          )}
          <button onClick={handleShare} style={{ background: 'none', border: '1px solid #333', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem', cursor: 'pointer' }}>
            COMPARTILHAR EVENTO
          </button>
        </div>
      </div>
    </div>
  );
}
