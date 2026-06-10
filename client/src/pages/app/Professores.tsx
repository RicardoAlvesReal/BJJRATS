// BJJRats PWA — Professores
// Lista professores cadastrados com busca, filtros e destaque contextual.

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, GraduationCap, MapPin, School, Search, Users } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type ProfessorFilter = 'all' | 'nearby' | 'academy';

interface Professor {
  uid: string;
  name?: string;
  photo?: string | null;
  academy?: string;
  academyId?: string | null;
  academyName?: string;
  academyCity?: string;
  academyState?: string;
  academyAddress?: string;
  academyLatitude?: number | null;
  academyLongitude?: number | null;
  academyLogoUrl?: string;
  professorPhotoUrl?: string;
  trialRequestsEnabled?: boolean;
  athleteType?: string;
  bjjSince?: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

function normalizeText(value?: string | null): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toCoordinate(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function getDistanceKm(origin: Coordinates, destination: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLon = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceKm: number) {
  return distanceKm < 10 ? `${distanceKm.toFixed(1)} km` : `${Math.round(distanceKm)} km`;
}

export default function Professores() {
  const { profile, user } = useAuth();
  const [profs, setProfs] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProfessorFilter>('all');
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [requestingTrial, setRequestingTrial] = useState<string | null>(null);

  const studentCity = normalizeText((profile as any)?.city || profile?.academyCity);
  const studentState = normalizeText((profile as any)?.state || profile?.academyState);
  const studentAcademyId = profile?.academyId || '';
  const studentAcademyName = normalizeText(profile?.academy || profile?.academyName);
  const currentProfessorName = normalizeText(profile?.professor);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.users.list({ role: 'professor' }) as Professor[];
        setProfs(data);
      } catch {
        setProfs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const requestUserLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      position => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // Sem permissao de localizacao, a tela segue usando cidade/UF como fallback.
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    requestUserLocation();
  }, []);

  const getProfessorDistance = (prof: Professor) => {
    const academyLatitude = toCoordinate(prof.academyLatitude);
    const academyLongitude = toCoordinate(prof.academyLongitude);
    if (!userCoords || academyLatitude === null || academyLongitude === null) return null;
    return getDistanceKm(userCoords, { latitude: academyLatitude, longitude: academyLongitude });
  };

  const isNearby = (prof: Professor) => {
    const distanceKm = getProfessorDistance(prof);
    if (distanceKm !== null) return distanceKm <= 50;

    const cityMatch = !!studentCity && normalizeText(prof.academyCity) === studentCity;
    const stateMatch = !!studentState && normalizeText(prof.academyState) === studentState;
    return cityMatch || stateMatch;
  };

  const isSameAcademy = (prof: Professor) => {
    const profAcademyName = normalizeText(prof.academyName || prof.academy);
    return (
      (!!studentAcademyId && (prof.uid === studentAcademyId || prof.academyId === studentAcademyId)) ||
      (!!studentAcademyName && profAcademyName === studentAcademyName)
    );
  };

  const isCurrentProfessor = (prof: Professor) => {
    return !!currentProfessorName && normalizeText(prof.name) === currentProfessorName;
  };

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return profs
      .filter(prof => {
        const matchesSearch = !q || [
          prof.name,
          prof.academy,
          prof.academyName,
          prof.academyCity,
          prof.academyState,
        ].some(value => normalizeText(value).includes(q));

        if (!matchesSearch) return false;
        if (filter === 'nearby') return isNearby(prof);
        if (filter === 'academy') return isSameAcademy(prof);
        return true;
      })
      .sort((a, b) => {
        const scoreA = (isCurrentProfessor(a) ? 10 : 0) + (isSameAcademy(a) ? 6 : 0) + (isNearby(a) ? 2 : 0);
        const scoreB = (isCurrentProfessor(b) ? 10 : 0) + (isSameAcademy(b) ? 6 : 0) + (isNearby(b) ? 2 : 0);
        const distanceA = getProfessorDistance(a) ?? Number.POSITIVE_INFINITY;
        const distanceB = getProfessorDistance(b) ?? Number.POSITIVE_INFINITY;
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (distanceA !== distanceB) return distanceA - distanceB;
        return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      });
  }, [currentProfessorName, filter, profs, search, studentAcademyId, studentAcademyName, studentCity, studentState, userCoords]);

  const stats = useMemo(() => {
    const nearby = profs.filter(isNearby).length;
    const academy = profs.filter(isSameAcademy).length;
    return { total: profs.length, nearby, academy };
  }, [profs, studentAcademyId, studentAcademyName, studentCity, studentState, userCoords]);

  const filterItems: Array<{ id: ProfessorFilter; label: string; count: number }> = [
    { id: 'all', label: 'TODOS', count: stats.total },
    { id: 'nearby', label: 'PERTO', count: stats.nearby },
    { id: 'academy', label: 'MINHA ACADEMIA', count: stats.academy },
  ];

  const handleTrialRequest = async (prof: Professor) => {
    if (!user) return;

    if (prof.trialRequestsEnabled === false) {
      toast.error('Este professor nao esta recebendo solicitacoes de aula gratis agora.');
      return;
    }

    let phone = (profile as any)?.phone || (user as any)?.phone || '';
    if (!phone.trim()) {
      phone = window.prompt('Informe seu WhatsApp para solicitar a aula gratis:') || '';
    }

    if (!phone.trim()) {
      toast.error('Informe um WhatsApp para o professor retornar o contato.');
      return;
    }

    setRequestingTrial(prof.uid);
    try {
      await api.public.createTrialRequest({
        targetKind: 'professor',
        targetUid: prof.uid,
        name: user.name || profile?.name || 'Aluno BJJRats',
        email: user.email || profile?.email || '',
        phone: phone.trim(),
        belt: user.belt || profile?.belt || 'Branca',
        message: `Aluno logado solicitou aula experimental gratuita com ${prof.name || 'professor'}.`,
      });
      toast.success(`Aula gratis solicitada para ${prof.name || 'professor'}!`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao solicitar aula gratis');
    } finally {
      setRequestingTrial(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '1rem 1rem calc(1rem + 70px)', maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
            PROFESSORES
          </p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.72rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.35rem' }}>
            {filtered.length} DE {stats.total} CADASTRADOS
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <Users size={16} strokeWidth={2.25} />
          REDE BJJRATS
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}>
        {[
          { label: 'MESTRES', value: stats.total, icon: GraduationCap, color: '#CC0000' },
          { label: 'PERTO', value: stats.nearby, icon: MapPin, color: '#0D9E6E' },
          { label: 'ACADEMIA', value: stats.academy, icon: School, color: '#1A6ECC' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bjj-card" style={{ padding: '0.75rem', minHeight: '78px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: `3px solid ${item.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.62rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</p>
                <Icon size={14} color={item.color} strokeWidth={2.25} />
              </div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.35rem', color: '#FFF', lineHeight: 1 }}>{item.value}</p>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color="#555" strokeWidth={2.25} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por nome, academia ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bjj-input"
            style={{ paddingLeft: '2.45rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none' as any }}>
        {filterItems.map(item => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              style={{
                flex: '0 0 auto',
                whiteSpace: 'nowrap',
                background: active ? '#1A0000' : '#111',
                border: `1px solid ${active ? '#CC0000' : '#252525'}`,
                color: active ? '#CC0000' : '#666',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 900,
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0.5rem 0.7rem',
                cursor: 'pointer',
              }}
            >
              {item.label} <span style={{ color: active ? '#FFF' : '#444' }}>{item.count}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="bjj-card" style={{ height: '132px', borderLeft: '3px solid #252525', opacity: 0.75 }} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <GraduationCap size={36} color="#333" strokeWidth={1.75} style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>
            {search || filter !== 'all' ? 'NENHUM PROFESSOR ENCONTRADO' : 'NENHUM PROFESSOR CADASTRADO'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {filtered.map(prof => {
            const professorPhoto = prof.professorPhotoUrl || prof.photo;
            const academyName = prof.academyName || prof.academy || 'Academia não informada';
            const sameAcademy = isSameAcademy(prof);
            const currentProfessor = isCurrentProfessor(prof);
            const nearby = isNearby(prof);
            const distanceKm = getProfessorDistance(prof);
            const locationText = [prof.academyCity, prof.academyState].filter(Boolean).join(' · ');

            return (
              <article
                key={prof.uid}
                className="bjj-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  borderLeft: `3px solid ${sameAcademy || currentProfessor ? '#CC0000' : '#1A6ECC'}`,
                  borderColor: sameAcademy || currentProfessor ? '#CC000066' : '#1E1E1E',
                }}
              >
                <div style={{ padding: '1rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative', width: '68px', height: '68px', flexShrink: 0 }}>
                    <div style={{
                      width: '68px', height: '68px', borderRadius: '50%', overflow: 'hidden',
                      border: '2px solid #CC0000', background: '#1A0000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {professorPhoto ? (
                        <img src={professorPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#CC0000' }}>
                          {(prof.name || '?').substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {prof.academyLogoUrl && (
                      <div style={{ position: 'absolute', right: '-3px', bottom: '-3px', width: '26px', height: '26px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #0A0A0A', background: '#111' }}>
                        <img src={prof.academyLogoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.05rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prof.name || 'Professor'}
                        </p>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.74rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>
                          Mestre BJJRats
                        </p>
                      </div>
                      {(currentProfessor || sameAcademy || distanceKm !== null || nearby) && (
                        <span style={{
                          flexShrink: 0,
                          fontFamily: 'Barlow Condensed, sans-serif',
                          fontWeight: 900,
                          fontSize: '0.56rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: currentProfessor || sameAcademy ? '#CC0000' : distanceKm !== null && distanceKm > 50 ? '#777' : '#0D9E6E',
                          border: `1px solid ${currentProfessor || sameAcademy ? '#CC0000' : distanceKm !== null && distanceKm > 50 ? '#444' : '#0D9E6E'}`,
                          padding: '0.12rem 0.35rem',
                        }}>
                          {currentProfessor ? 'SEU PROF.' : sameAcademy ? 'SUA ACADEMIA' : distanceKm !== null ? formatDistance(distanceKm) : 'PERTO'}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', minWidth: 0 }}>
                        <School size={14} color="#666" strokeWidth={2.1} style={{ flexShrink: 0 }} />
                        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{academyName}</p>
                      </div>
                      {(locationText || distanceKm !== null) && (
                        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', minWidth: 0 }}>
                          <MapPin size={14} color="#666" strokeWidth={2.1} style={{ flexShrink: 0 }} />
                          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.76rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {distanceKm !== null ? `${formatDistance(distanceKm)}${locationText ? ` · ${locationText}` : ''}` : locationText}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #1E1E1E', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  {[
                    { label: 'ACADEMIA', value: academyName, icon: School },
                    { label: distanceKm !== null ? 'DISTANCIA' : 'LOCAL', value: distanceKm !== null ? formatDistance(distanceKm) : locationText || 'Não informado', icon: MapPin },
                  ].map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} style={{ padding: '0.7rem 0.75rem', borderRight: index === 0 ? '1px solid #1E1E1E' : 'none', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                          <Icon size={12} color="#444" strokeWidth={2.2} />
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.56rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</p>
                        </div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.82rem', color: '#FFF', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.value}</p>
                      </div>
                    );
                  })}
                </div>

                {prof.trialRequestsEnabled !== false && (
                  <div style={{ borderTop: '1px solid #1E1E1E', padding: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => handleTrialRequest(prof)}
                      disabled={requestingTrial === prof.uid}
                      style={{
                        background: requestingTrial === prof.uid ? '#1A1A1A' : '#0D9E6E',
                        border: 'none',
                        color: '#03140D',
                        fontFamily: 'Barlow Condensed, sans-serif',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        padding: '0.7rem 0.75rem',
                        cursor: requestingTrial === prof.uid ? 'not-allowed' : 'pointer',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        opacity: requestingTrial === prof.uid ? 0.65 : 1,
                      }}
                    >
                      {requestingTrial === prof.uid ? 'SOLICITANDO...' : <><CalendarPlus size={16} /> SOLICITAR AULA GRATIS</>}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
