// BJJRats PWA — AcademySearch
// Design: "Cage Fighter" — Brutalismo Tático
// Permite ao aluno buscar academias cadastradas por professores e solicitar vínculo

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Link as LinkIcon, LocateFixed, MapPin, School, Search, UserRound } from 'lucide-react';

interface AcademyResult {
  professorUid: string;
  academyName: string;
  academyCity: string;
  academyState: string;
  academyAddress?: string;
  academyLatitude?: number | null;
  academyLongitude?: number | null;
  academyLogoUrl?: string;
  professorPhotoUrl?: string;
  professorName: string;
  locationScore: number;
  distanceKm?: number | null;
}

interface Props {
  onBack?: () => void;
  onLinked: () => void;
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

export default function AcademySearch({ onBack, onLinked }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AcademyResult[]>([]);
  const [academyUsers, setAcademyUsers] = useState<any[]>([]);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const studentCity = normalizeText((profile as any)?.city || profile?.academyCity);
  const studentState = normalizeText((profile as any)?.state || profile?.academyState);

  const mapAcademies = (users: any[], term: string): AcademyResult[] => {
    const normalizedTerm = normalizeText(term);
    const seen = new Set<string>();

    return users
      .filter(data => data.role === 'admin' || data.role === 'professor' || data.isAcademyAdmin)
      .map(data => {
        const academyCity = data.academyCity || '';
        const academyState = data.academyState || '';
        const academyLatitude = toCoordinate(data.academyLatitude);
        const academyLongitude = toCoordinate(data.academyLongitude);
        const normalizedCity = normalizeText(academyCity);
        const normalizedState = normalizeText(academyState);
        const locationScore =
          (studentCity && normalizedCity === studentCity ? 2 : 0) +
          (studentState && normalizedState === studentState ? 1 : 0);
        const distanceKm =
          userCoords && academyLatitude !== null && academyLongitude !== null
            ? getDistanceKm(userCoords, { latitude: academyLatitude, longitude: academyLongitude })
            : null;

        return {
          professorUid: data.uid,
          academyName: data.academyName || data.academy || '',
          academyCity,
          academyState,
          academyAddress: data.academyAddress || '',
          academyLatitude,
          academyLongitude,
          academyLogoUrl: data.academyLogoUrl || '',
          professorPhotoUrl: data.professorPhotoUrl || data.photo || '',
          professorName: data.name || '',
          locationScore,
          distanceKm,
        };
      })
      .filter(a => {
        if (!a.professorUid || seen.has(a.professorUid) || !a.academyName) return false;
        seen.add(a.professorUid);
        if (!normalizedTerm) return true;
        return (
          normalizeText(a.academyName).includes(normalizedTerm) ||
          normalizeText(a.academyAddress).includes(normalizedTerm) ||
          normalizeText(a.academyCity).includes(normalizedTerm) ||
          normalizeText(a.academyState).includes(normalizedTerm) ||
          normalizeText(a.professorName).includes(normalizedTerm)
        );
      })
      .sort((a, b) => {
        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        if (aDistance !== bDistance) return aDistance - bDistance;
        return (
          b.locationScore - a.locationScore ||
          a.academyName.localeCompare(b.academyName, 'pt-BR')
        );
      });
  };

  const loadAcademies = async (term = '') => {
    setLoading(true);
    setSearched(true);
    try {
      const users = await api.users.list() as any[];
      setAcademyUsers(users);
      setResults(mapAcademies(users, term));
    } catch {
      toast.error('Erro ao buscar academias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademies();
  }, []);

  useEffect(() => {
    if (academyUsers.length === 0) return;
    setResults(mapAcademies(academyUsers, search));
  }, [userCoords]);

  const handleSearch = async () => {
    if (academyUsers.length > 0) {
      setSearched(true);
      setResults(mapAcademies(academyUsers, search));
      return;
    }
    await loadAcademies(search);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      toast.error('GPS nao disponivel neste navegador');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
        toast.success('GPS ativado para ordenar academias por distancia');
      },
      () => {
        setLocating(false);
        toast.error('Nao foi possivel acessar sua localizacao');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleLink = async (academy: AcademyResult) => {
    if (!user) return;
    setLinking(academy.professorUid);
    try {
      const studentName = user.name || 'Novo aluno';
      const studentBelt = user.belt || 'Branca';
      const studentPhoto = user.photo || null;

      await api.academyRequests.create({
        studentName,
        studentEmail: user.email,
        studentBelt,
        studentPhoto,
        professorUid: academy.professorUid,
        academyName: academy.academyName,
        professorName: academy.professorName,
        status: 'pending',
      });

      await refreshProfile();
      toast.success(`Solicitação enviada para ${academy.academyName}! Aguarde a aprovação do professor.`);
      onLinked();
    } catch {
      toast.error('Erro ao vincular à academia');
    } finally {
      setLinking(null);
    }
  };

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '2px solid #CC0000', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: '#CC0000', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        )}
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em' }}>
          ACADEMIAS DISPONÍVEIS
        </h1>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {/* Instrução */}
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#888', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Use o GPS para ordenar por distancia quando a academia tiver localizacao salva. Sem GPS, cidade/UF continuam como prioridade.
        </p>

        {/* Campo de busca */}
        <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Ex: Templo, São Paulo, Gustavo..."
            style={{
              flex: 1,
              background: '#111',
              border: '1px solid #2A2A2A',
              color: '#FFFFFF',
              fontFamily: 'Barlow, sans-serif',
              fontSize: '0.9375rem',
              padding: '0.75rem 1rem',
              outline: 'none',
              minWidth: '180px',
            }}
          />
          <button
            type="button"
            onClick={handleUseGps}
            disabled={locating}
            title="Usar GPS para ordenar por distancia"
            style={{
              background: userCoords ? '#063820' : '#111',
              border: `1px solid ${userCoords ? '#0D9E6E' : '#2A2A2A'}`,
              color: userCoords ? '#0DFF9A' : '#FFFFFF',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: '0.8125rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0.75rem 0.875rem',
              cursor: locating ? 'not-allowed' : 'pointer',
              opacity: locating ? 0.6 : 1,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              minWidth: '108px',
            }}
          >
            <LocateFixed size={16} />
            {locating ? 'GPS...' : userCoords ? 'GPS ATIVO' : 'USAR GPS'}
          </button>
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              background: '#CC0000',
              border: 'none',
              color: '#FFFFFF',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.75rem 1.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
            }}
          >
            <Search size={16} />
            {loading ? '...' : 'FILTRAR'}
          </button>
        </div>

        {/* Resultados */}
        {loading && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>
              BUSCANDO ACADEMIAS...
            </p>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <Search size={40} style={{ color: '#333', margin: '0 auto 0.75rem' }} />
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>
              NENHUMA ACADEMIA DISPONÍVEL
            </p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#444', marginTop: '0.5rem' }}>
              Tente outro filtro ou aguarde uma academia/professor se cadastrar.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: '0.25rem' }}>
              {results.length} ACADEMIA{results.length !== 1 ? 'S' : ''} ENCONTRADA{results.length !== 1 ? 'S' : ''}
            </p>
            {results.map(academy => (
              <div
                key={academy.professorUid}
                style={{ background: '#111', border: '1px solid #1E1E1E', padding: '1rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}
              >
                {/* Logo ou ícone */}
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #CC0000', flexShrink: 0, background: '#1A0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {academy.academyLogoUrl ? (
                    <img src={academy.academyLogoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <School size={26} style={{ color: '#CC0000' }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>
                    {academy.academyName || 'Academia sem nome'}
                  </p>
                  {academy.distanceKm !== null && academy.distanceKm !== undefined ? (
                    <span style={{ display: 'inline-block', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0DFF9A', border: '1px solid #0D9E6E', padding: '0.125rem 0.375rem', marginBottom: '0.375rem' }}>
                      {formatDistance(academy.distanceKm)}
                    </span>
                  ) : academy.locationScore > 0 && (
                    <span style={{ display: 'inline-block', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0D9E6E', border: '1px solid #0D9E6E', padding: '0.125rem 0.375rem', marginBottom: '0.375rem' }}>
                      MESMA REGIAO
                    </span>
                  )}
                  {(academy.academyCity || academy.academyState) && (
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#888', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <MapPin size={14} style={{ color: '#777', flexShrink: 0 }} />
                      <span>{[academy.academyCity, academy.academyState].filter(Boolean).join(' - ')}</span>
                    </p>
                  )}
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#666', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <UserRound size={14} style={{ color: '#666', flexShrink: 0 }} />
                    <span>Prof. {academy.professorName}</span>
                  </p>

                  <button
                    onClick={() => handleLink(academy)}
                    disabled={linking === academy.professorUid}
                    style={{
                      background: linking === academy.professorUid ? '#333' : '#CC0000',
                      border: 'none',
                      color: '#FFFFFF',
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '0.5rem 1rem',
                      cursor: linking === academy.professorUid ? 'not-allowed' : 'pointer',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    {linking === academy.professorUid ? 'VINCULANDO...' : <><LinkIcon size={15} /> VINCULAR A ESTA ACADEMIA</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
