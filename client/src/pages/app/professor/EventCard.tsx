// BJJRats PWA — EventCard (extracted from ProfessorPanel)
import React, { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Navigation } from 'lucide-react';
import { getEventLocationLabel, getEventMapEmbedUrl, getEventGoogleMapsUrl } from '@/lib/eventLocation';

interface AcademyEvent {
  id: string;
  title: string;
  description?: string;
  type?: string;
  date: string;
  time?: string;
  location?: string;
  slots?: number;
  registrations?: string[];
  registrationsClosed?: boolean;
}

export default function EventCard({ ev, accentColor, professorProfile, onDelete }: {
  ev: AcademyEvent;
  accentColor: string;
  professorProfile: any;
  onDelete: () => void;
}) {
  const [closing, setClosing] = useState(false);

  const handleCloseRegistrations = async () => {
    if (closing) return;
    setClosing(true);
    try {
      await api.events.update(ev.id, { registrationsClosed: true });

      const registrations = ev.registrations || [];
      const academyName = professorProfile?.academyName || professorProfile?.academy || 'Academia';
      const locationLabel = getEventLocationLabel(ev as any);
      const notifPromises = registrations.map((uid: string) =>
        api.notifications.create({
          toUid: uid,
          type: 'event_confirmed',
          message: `Inscrições encerradas para "${ev.title}"${ev.date ? ` em ${ev.date}` : ''}${ev.time ? ` às ${ev.time}` : ''}${locationLabel ? ` — ${locationLabel}` : ''}. Você está confirmado!`,
          data: { eventId: ev.id, eventTitle: ev.title, eventDate: ev.date, eventTime: ev.time || '', eventLocation: locationLabel, academyName },
          read: false,
        })
      );
      await Promise.all(notifPromises);
      toast.success(`Inscrições encerradas. ${registrations.length} aluno${registrations.length !== 1 ? 's' : ''} notificado${registrations.length !== 1 ? 's' : ''}!`);
    } catch {
      toast.error('Erro ao encerrar inscrições');
    } finally {
      setClosing(false);
    }
  };

  const isClosed = (ev as any).registrationsClosed === true;
  const locationLabel = getEventLocationLabel(ev as any);
  const hasMap = Boolean(locationLabel);

  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>{ev.title}</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: accentColor, textTransform: 'uppercase', marginTop: '0.25rem' }}>{ev.date}{ev.time ? ` · ${ev.time}` : ''}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span style={{ background: accentColor + '22', border: `1px solid ${accentColor}`, color: accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', flexShrink: 0 }}>{(ev.type || 'outro').replace('_', ' ').toUpperCase()}</span>
          {isClosed && (
            <span style={{ background: '#0D9E6E22', border: '1px solid #0D9E6E', color: '#0D9E6E', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.55rem', textTransform: 'uppercase', padding: '0.1rem 0.375rem' }}>ENCERRADO</span>
          )}
        </div>
      </div>
      {locationLabel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#888' }}>📍 {locationLabel}</p>
          <div style={{ border: '1px solid #1E1E1E', background: '#080808', overflow: 'hidden' }}>
            <iframe
              title={`Mapa de ${ev.title}`}
              src={getEventMapEmbedUrl(ev as any)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ width: '100%', height: '150px', border: 'none', display: 'block', background: '#0A0A0A' }}
            />
          </div>
        </div>
      )}
      {ev.description && <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#666', lineHeight: 1.4 }}>{ev.description}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555' }}>{(ev.registrations ?? []).length} INSCRITO{(ev.registrations ?? []).length !== 1 ? 'S' : ''}{ev.slots ? ` / ${ev.slots} VAGAS` : ''}</span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {!isClosed && (ev.registrations ?? []).length > 0 && (
            <button
              onClick={handleCloseRegistrations}
              disabled={closing}
              style={{ background: '#0A2A1A', border: '1px solid #0D9E6E', color: '#0D9E6E', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.4rem 0.5rem', cursor: closing ? 'not-allowed' : 'pointer', opacity: closing ? 0.6 : 1 }}
            >
              {closing ? '...' : '✓ ENCERRAR'}
            </button>
          )}
          {hasMap && (
            <a href={getEventGoogleMapsUrl(ev as any)} target="_blank" rel="noreferrer"
              style={{ background: '#101821', border: `1px solid ${accentColor}55`, color: accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Navigation size={13} /> MAPS
            </a>
          )}
          <button onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/evento/${ev.id}`).catch(() => {}); toast.success('Link copiado!'); }}
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
            🔗 LINK
          </button>
          <button onClick={onDelete}
            style={{ background: '#1A0000', border: '1px solid #3A0000', color: '#CC3333', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer' }}>
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
