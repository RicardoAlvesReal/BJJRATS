// BJJRats — Aba de Eventos para o Painel da Academia
import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
  formatCep,
  getEventAddressLabel,
  getEventGoogleMapsUrl,
  getEventLocationLabel,
  getEventMapEmbedUrl,
} from '@/lib/eventLocation';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface AcademyEvent {
  id: string;
  title: string;
  description?: string;
  type: string;
  date: string;
  time?: string;
  location?: string;
  locationCep?: string;
  locationAddress?: string;
  locationNumber?: string;
  locationNeighborhood?: string;
  locationCity?: string;
  locationState?: string;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  slots?: number;
  price?: string;
  registrations?: string[];
  registrationsClosed?: boolean;
  createdAtStr?: string;
}

const EMPTY_EVENT_FORM = {
  title: '',
  description: '',
  type: 'outro',
  date: '',
  time: '',
  location: '',
  locationCep: '',
  locationAddress: '',
  locationNumber: '',
  locationNeighborhood: '',
  locationCity: '',
  locationState: '',
  locationLatitude: null as number | null,
  locationLongitude: null as number | null,
  slots: '',
  price: '',
};

const ACCENT = '#E87722';

// ── EventCard ─────────────────────────────────────────────────────────────────
function EventCard({ ev, profile, onDelete }: { ev: AcademyEvent; profile: any; onDelete: () => void }) {
  const [closing, setClosing] = useState(false);
  const isClosed = (ev as any).registrationsClosed === true;
  const locationLabel = getEventLocationLabel(ev);

  const handleCloseRegistrations = async () => {
    if (closing) return;
    setClosing(true);
    try {
      await api.events.update(ev.id, { registrationsClosed: true });
      const academyName = profile?.academyName || profile?.academy || 'Academia';
      const notifPromises = (ev.registrations || []).map((uid: string) =>
        api.notifications.create({
          toUid: uid,
          type: 'event_confirmed',
          message: `Inscrições encerradas para "${ev.title}"${ev.date ? ` em ${ev.date}` : ''}${ev.time ? ` às ${ev.time}` : ''}${locationLabel ? ` — ${locationLabel}` : ''}. Você está confirmado!`,
          data: { eventId: ev.id, eventTitle: ev.title, eventDate: ev.date, eventTime: ev.time || '', eventLocation: locationLabel, academyName },
          read: false,
        })
      );
      await Promise.all(notifPromises);
      toast.success(`Inscrições encerradas. ${(ev.registrations || []).length} aluno(s) notificado(s)!`);
    } catch {
      toast.error('Erro ao encerrar inscrições');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFF', lineHeight: 1 }}>{ev.title}</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: ACCENT, textTransform: 'uppercase', marginTop: '0.25rem' }}>
            {ev.date}{ev.time ? ` · ${ev.time}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span style={{ background: ACCENT + '22', border: `1px solid ${ACCENT}`, color: ACCENT, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem' }}>
            {(ev.type || 'outro').replace('_', ' ').toUpperCase()}
          </span>
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
              src={getEventMapEmbedUrl(ev)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ width: '100%', height: '150px', border: 'none', display: 'block', background: '#0A0A0A' }}
            />
          </div>
        </div>
      )}
      {ev.description && (
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#666', lineHeight: 1.4 }}>{ev.description}</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555' }}>
          {(ev.registrations ?? []).length} INSCRITO{(ev.registrations ?? []).length !== 1 ? 'S' : ''}
          {ev.slots ? ` / ${ev.slots} VAGAS` : ''}
        </span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {!isClosed && (ev.registrations ?? []).length > 0 && (
            <button onClick={handleCloseRegistrations} disabled={closing}
              style={{ background: '#0A2A1A', border: '1px solid #0D9E6E', color: '#0D9E6E', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', padding: '0.4rem 0.5rem', cursor: closing ? 'not-allowed' : 'pointer', opacity: closing ? 0.6 : 1 }}>
              {closing ? '...' : '✓ ENCERRAR'}
            </button>
          )}
          {Boolean(locationLabel) && (
            <a href={getEventGoogleMapsUrl(ev)} target="_blank" rel="noreferrer"
              style={{ background: '#101821', border: `1px solid ${ACCENT}55`, color: ACCENT, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.4rem 0.625rem', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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

// ── EventosTab ─────────────────────────────────────────────────────────────────
export default function EventosTab() {
  const { user, profile } = useAuth();

  const [events, setEvents] = useState<AcademyEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [savingEvent, setSavingEvent] = useState(false);
  const [fetchingEventCep, setFetchingEventCep] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<{
    name: string; cep: string; address: string; number: string; neighborhood: string; city: string; state: string; label: string;
  }[]>([]);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setEventsLoading(true);
    try {
      const all = await api.events.list({ authorUid: user.uid });
      const sorted = (all as AcademyEvent[]).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
      setEvents(sorted);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const loadLocationSuggestions = useCallback(async () => {
    if (locationSuggestions.length > 0) return;
    try {
      const academies = await api.public.searchAcademies('');
      const items = (academies as any[])
        .map(p => ({
          name: (p.academyName || p.name || '').trim(),
          cep: p.academyCep || '',
          address: p.academyAddress || '',
          number: p.academyNumber || '',
          neighborhood: p.academyNeighborhood || '',
          city: p.academyCity || '',
          state: p.academyState || '',
          label: p.academyCity && p.academyState ? `${p.academyCity} - ${p.academyState}` : p.academyCity || '',
        }))
        .filter(p => p.name)
        .filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i);
      setLocationSuggestions(items);
    } catch { /* silencia */ }
  }, [locationSuggestions.length]);

  const handleEventCepChange = async (raw: string) => {
    const cep = raw.replace(/\D/g, '').slice(0, 8);
    setEventForm(p => ({ ...p, locationCep: cep, locationLatitude: null, locationLongitude: null }));
    if (cep.length !== 8) return;
    setFetchingEventCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data?.erro) { toast.warning('CEP não encontrado.'); return; }
      setEventForm(p => ({
        ...p,
        locationCep: cep,
        locationAddress: data.logradouro || p.locationAddress,
        locationNeighborhood: data.bairro || p.locationNeighborhood,
        locationCity: data.localidade || p.locationCity,
        locationState: data.uf || p.locationState,
        locationLatitude: null,
        locationLongitude: null,
      }));
    } catch {
      toast.warning('Não foi possível buscar o CEP. Preencha o endereço manualmente.');
    } finally {
      setFetchingEventCep(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!user || !profile) return;
    if (!eventForm.title.trim() || !eventForm.date || !eventForm.description.trim() || !eventForm.slots || !eventForm.time || !eventForm.type) return;
    setSavingEvent(true);
    try {
      const publisherName = (profile as any).academyName || profile.name;
      const publisherLogo = (profile as any).academyLogoUrl || (profile as any).academyLogo || '';
      const eventAddressLabel = getEventAddressLabel(eventForm);
      await api.events.create({
        authorUid: user.uid,
        academyId: user.uid,
        academyName: publisherName,
        academyLogo: publisherLogo,
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        type: eventForm.type,
        date: eventForm.date,
        time: eventForm.time || null,
        location: eventForm.location.trim() || eventAddressLabel || null,
        locationCep: eventForm.locationCep.replace(/\D/g, '') || null,
        locationAddress: eventForm.locationAddress.trim() || null,
        locationNumber: eventForm.locationNumber.trim() || null,
        locationNeighborhood: eventForm.locationNeighborhood.trim() || null,
        locationCity: eventForm.locationCity.trim() || null,
        locationState: eventForm.locationState.trim() || null,
        locationLatitude: eventForm.locationLatitude,
        locationLongitude: eventForm.locationLongitude,
        slots: eventForm.slots ? parseInt(eventForm.slots) : null,
        price: (eventForm.price === '' || Number(eventForm.price) === 0) ? 'Gratuito' : `R$ ${Number(eventForm.price).toFixed(2)}`,
        registrations: [],
        createdAtStr: new Date().toLocaleDateString('pt-BR'),
      });
      toast.success('Evento criado!');
      setEventForm(EMPTY_EVENT_FORM);
      setShowNewEvent(false);
      loadEvents();
    } catch {
      toast.error('Erro ao criar evento');
    } finally {
      setSavingEvent(false);
    }
  };

  const eventAddressPreview = getEventAddressLabel(eventForm);
  const eventLocationPreview = getEventLocationLabel(eventForm);
  const eventHasMapPreview = Boolean(eventAddressPreview || eventForm.location.trim());
  const canSubmit = eventForm.title.trim() && eventForm.date && eventForm.description.trim() && eventForm.slots && eventForm.time && eventForm.type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <button onClick={() => setShowNewEvent(true)}
        style={{ background: ACCENT, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.875rem', cursor: 'pointer', width: '100%' }}>
        + NOVO EVENTO
      </button>

      {showNewEvent && (
        <div style={{ background: '#111', border: `1px solid ${ACCENT}`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', color: '#FFF' }}>NOVO EVENTO</p>

          {[{ k: 'title', l: 'TÍTULO *', ph: 'Ex: Open Match Interno' }, { k: 'description', l: 'DESCRIÇÃO *', ph: 'Detalhes do evento...' }].map(f => (
            <div key={f.k}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{f.l}</p>
              <input type="text" value={(eventForm as Record<string, string>)[f.k]}
                onChange={e => setEventForm(prev => ({ ...prev, [f.k]: e.target.value }))}
                placeholder={f.ph}
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}

          {/* Vagas e Valor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>VAGAS *</p>
              <input type="number" min={1} step={1} value={eventForm.slots}
                onChange={e => setEventForm(prev => ({ ...prev, slots: e.target.value }))} placeholder="Ex: 30"
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>VALOR (R$) — 0 = gratuito</p>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#666', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', pointerEvents: 'none' }}>R$</span>
                <input type="number" min={0} step={0.01} value={eventForm.price}
                  onChange={e => setEventForm(prev => ({ ...prev, price: e.target.value }))} placeholder="0,00"
                  style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem 0.625rem 2.2rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {(eventForm.price === '' || Number(eventForm.price) === 0) && (
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#25D366', marginTop: '0.25rem' }}>✓ GRATUITO</p>
              )}
            </div>
          </div>

          {/* Local */}
          <div style={{ border: '1px solid #1E1E1E', background: '#0D0D0D', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <MapPin size={15} style={{ color: ACCENT }} />
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LOCAL DO EVENTO</p>
            </div>
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>NOME DO LOCAL</p>
              <input type="text" list="aca-event-location-suggestions" value={eventForm.location}
                onChange={e => {
                  const val = e.target.value;
                  const match = locationSuggestions.find(s => s.name === val);
                  if (match) {
                    setEventForm(prev => ({
                      ...prev, location: val,
                      locationCep: match.cep.replace(/\D/g, ''),
                      locationAddress: match.address || prev.locationAddress,
                      locationNumber: match.number || prev.locationNumber,
                      locationNeighborhood: match.neighborhood || prev.locationNeighborhood,
                      locationCity: match.city || prev.locationCity,
                      locationState: match.state || prev.locationState,
                      locationLatitude: null, locationLongitude: null,
                    }));
                  } else {
                    setEventForm(prev => ({ ...prev, location: val }));
                  }
                }}
                onFocus={loadLocationSuggestions}
                placeholder="Ex: Academia Templo, Ginásio Municipal"
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
              <datalist id="aca-event-location-suggestions">
                {locationSuggestions.map((s, i) => (
                  <option key={i} value={s.name}>{s.label ? `${s.name} — ${s.label}` : s.name}</option>
                ))}
              </datalist>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,0.45fr) minmax(0,1fr)', gap: '0.625rem' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CEP</p>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={formatCep(eventForm.locationCep)} onChange={e => handleEventCepChange(e.target.value)} placeholder="00000-000" maxLength={9}
                    style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${eventForm.locationCep.length === 8 ? ACCENT : '#2A2A2A'}`, color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                  {fetchingEventCep && <span style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#777', fontSize: '0.7rem' }}>buscando...</span>}
                </div>
              </div>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>ENDEREÇO</p>
                <input type="text" value={eventForm.locationAddress} onChange={e => setEventForm(prev => ({ ...prev, locationAddress: e.target.value }))} placeholder="Rua / Avenida"
                  style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '0.45fr 1fr', gap: '0.625rem' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>NÚMERO</p>
                <input type="text" value={eventForm.locationNumber} onChange={e => setEventForm(prev => ({ ...prev, locationNumber: e.target.value }))} placeholder="123"
                  style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>BAIRRO</p>
                <input type="text" value={eventForm.locationNeighborhood} onChange={e => setEventForm(prev => ({ ...prev, locationNeighborhood: e.target.value }))} placeholder="Bairro"
                  style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.35fr', gap: '0.625rem' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CIDADE</p>
                <input type="text" value={eventForm.locationCity} onChange={e => setEventForm(prev => ({ ...prev, locationCity: e.target.value }))} placeholder="Cidade"
                  style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>UF</p>
                <input type="text" value={eventForm.locationState}
                  onChange={e => setEventForm(prev => ({ ...prev, locationState: e.target.value.toUpperCase().slice(0, 2) }))}
                  placeholder="SP" maxLength={2}
                  style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
              </div>
            </div>
            {eventHasMapPreview && (
              <div style={{ border: '1px solid #222', background: '#080808', overflow: 'hidden' }}>
                <iframe title="Mapa do evento" src={getEventMapEmbedUrl(eventForm)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  style={{ width: '100%', height: '180px', border: 'none', display: 'block', background: '#0A0A0A' }} />
                <div style={{ padding: '0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.625rem', borderTop: '1px solid #1A1A1A' }}>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#777', lineHeight: 1.35, margin: 0 }}>{eventLocationPreview}</p>
                  <a href={getEventGoogleMapsUrl(eventForm)} target="_blank" rel="noreferrer"
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', color: ACCENT, textDecoration: 'none', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    <Navigation size={14} /> MAPS
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Data e Horário */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>DATA *</p>
              <input type="date" value={eventForm.date} min={new Date().toISOString().split('T')[0]}
                onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                style={{ width: '100%', background: '#0A0A0A', border: `1px solid ${eventForm.date ? ACCENT : '#2A2A2A'}`, color: eventForm.date ? '#FFF' : '#666', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>HORÁRIO *</p>
              <input type="time" value={eventForm.time} onChange={e => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>TIPO *</p>
            <select value={eventForm.type} onChange={e => setEventForm(prev => ({ ...prev, type: e.target.value }))}
              style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem 0.75rem', outline: 'none', boxSizing: 'border-box' }}>
              {[['competicao', '🏆 COMPETIÇÃO'], ['seminario', '📚 SEMINÁRIO'], ['aula_especial', '🥋 AULA ESPECIAL'], ['open_match', '⚔️ OPEN MATCH'], ['outro', '📅 OUTRO']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button onClick={() => { setShowNewEvent(false); setEventForm(EMPTY_EVENT_FORM); }}
              style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#666', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>
              CANCELAR
            </button>
            <button onClick={handleSaveEvent} disabled={savingEvent || !canSubmit}
              style={{ flex: 2, background: (savingEvent || !canSubmit) ? '#333' : ACCENT, border: 'none', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', padding: '0.625rem', cursor: 'pointer' }}>
              {savingEvent ? 'SALVANDO...' : '📅 CRIAR EVENTO'}
            </button>
          </div>
        </div>
      )}

      {eventsLoading && (
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>CARREGANDO...</p>
      )}
      {!eventsLoading && events.length === 0 && !showNewEvent && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>NENHUM EVENTO CRIADO</p>
        </div>
      )}
      {events.map(ev => (
        <EventCard key={ev.id} ev={ev} profile={profile}
          onDelete={async () => {
            await api.events.delete(ev.id);
            setEvents(prev => prev.filter(e => e.id !== ev.id));
            toast.success('Evento removido');
          }}
        />
      ))}
    </div>
  );
}
