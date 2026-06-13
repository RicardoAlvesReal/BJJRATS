// BJJRats PWA — AcademySearch
// Design: "Cage Fighter" — Brutalismo Tático
// Permite ao aluno buscar academias cadastradas por professores e solicitar vínculo

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, CalendarPlus, Car, ExternalLink, Info, Link as LinkIcon, MapPin, MessageCircle, Navigation, Phone, School, Search, X } from 'lucide-react';

interface AcademyResult {
  professorUid: string;
  academyName: string;
  academyCity: string;
  academyState: string;
  academyAddress?: string;
  academyLatitude?: number | null;
  academyLongitude?: number | null;
  phone?: string;
  academyLogoUrl?: string;
  professorPhotoUrl?: string;
  professorName: string;
  trialRequestsEnabled?: boolean;
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

function getAddressLabel(academy: AcademyResult) {
  return [
    academy.academyAddress,
    [academy.academyCity, academy.academyState].filter(Boolean).join(' - '),
  ].filter(Boolean).join(', ');
}

function getDestinationLabel(academy: AcademyResult) {
  const address = getAddressLabel(academy);
  return address || academy.academyName;
}

function getCoordinateLabel(academy: AcademyResult) {
  if (academy.academyLatitude === null || academy.academyLatitude === undefined) return null;
  if (academy.academyLongitude === null || academy.academyLongitude === undefined) return null;
  return `${academy.academyLatitude},${academy.academyLongitude}`;
}

function getMapDestination(academy: AcademyResult) {
  return getCoordinateLabel(academy) || getDestinationLabel(academy);
}

function getGoogleMapsUrl(academy: AcademyResult) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getMapDestination(academy))}`;
}

function getWazeUrl(academy: AcademyResult) {
  const coords = getCoordinateLabel(academy);
  if (coords) {
    return `https://waze.com/ul?ll=${encodeURIComponent(coords)}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(getDestinationLabel(academy))}&navigate=yes`;
}

function getUberUrl(academy: AcademyResult) {
  const params = new URLSearchParams({
    action: 'setPickup',
    pickup: 'my_location',
  });
  if (academy.academyLatitude !== null && academy.academyLatitude !== undefined && academy.academyLongitude !== null && academy.academyLongitude !== undefined) {
    params.set('dropoff[latitude]', String(academy.academyLatitude));
    params.set('dropoff[longitude]', String(academy.academyLongitude));
  } else {
    params.set('dropoff[formatted_address]', getDestinationLabel(academy));
  }
  params.set('dropoff[nickname]', academy.academyName);
  return `https://m.uber.com/ul/?${params.toString()}`;
}

function getNinetyNineUrl() {
  return 'https://99app.com/passageiro/';
}

function getMapEmbedUrl(academy: AcademyResult) {
  return `https://www.google.com/maps?q=${encodeURIComponent(getMapDestination(academy))}&output=embed`;
}

function normalizeWhatsAppPhone(value?: string | null) {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

function getWhatsAppUrl(academy: AcademyResult) {
  const phone = normalizeWhatsAppPhone(academy.phone);
  if (!phone) return '';
  const text = `Ola! Vim pelo BJJRats e queria informacoes sobre a ${academy.academyName}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function AcademySearch({ onBack, onLinked }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AcademyResult[]>([]);
  const [academyUsers, setAcademyUsers] = useState<any[]>([]);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [requestingTrial, setRequestingTrial] = useState<string | null>(null);
  const [selectedAcademy, setSelectedAcademy] = useState<AcademyResult | null>(null);
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
          phone: data.phone || '',
          academyLogoUrl: data.academyLogoUrl || '',
          professorPhotoUrl: data.professorPhotoUrl || data.photo || '',
          professorName: data.name || '',
          trialRequestsEnabled: data.trialRequestsEnabled !== false,
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
    loadAcademies();
    requestUserLocation();
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

  const handleTrialRequest = async (academy: AcademyResult) => {
    if (!user) return;

    if (academy.trialRequestsEnabled === false) {
      toast.error('Esta academia nao esta recebendo solicitacoes de aula gratis agora.');
      return;
    }

    let phone = (profile as any)?.phone || (user as any)?.phone || '';
    if (!phone.trim()) {
      phone = window.prompt('Informe seu WhatsApp para solicitar a aula gratis:') || '';
    }

    if (!phone.trim()) {
      toast.error('Informe um WhatsApp para a academia retornar o contato.');
      return;
    }

    setRequestingTrial(academy.professorUid);
    try {
      await api.public.createTrialRequest({
        targetKind: 'academy',
        targetUid: academy.professorUid,
        name: user.name || profile?.name || 'Aluno BJJRats',
        email: user.email || profile?.email || '',
        phone: phone.trim(),
        belt: user.belt || profile?.belt || 'Branca',
        message: `Aluno logado solicitou aula experimental gratuita na ${academy.academyName}.`,
      });
      toast.success(`Aula gratis solicitada para ${academy.academyName}!`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao solicitar aula gratis');
    } finally {
      setRequestingTrial(null);
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
          Academias proximas aparecem primeiro quando voce autorizar a localizacao. Sem GPS, cidade/UF continuam como prioridade.
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
              minHeight: '48px',
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
                style={{ background: '#111', border: '1px solid #1E1E1E', overflow: 'hidden' }}
              >
                {/* Área clicável de info → abre detalhes */}
                <button
                  type="button"
                  onClick={() => setSelectedAcademy(academy)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '0.875rem',
                    alignItems: 'center',
                    textAlign: 'left',
                  }}
                >
                  {/* Logo */}
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #CC0000', flexShrink: 0, background: '#1A0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {academy.academyLogoUrl ? (
                      <img src={academy.academyLogoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <School size={24} style={{ color: '#CC0000' }} />
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.0625rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.03em', marginBottom: '0.2rem', lineHeight: 1.15 }}>
                      {academy.academyName || 'Academia sem nome'}
                    </p>
                    {academy.distanceKm !== null && academy.distanceKm !== undefined ? (
                      <span style={{ display: 'inline-block', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0DFF9A', border: '1px solid #0D9E6E', padding: '0.1rem 0.35rem', marginBottom: '0.3rem' }}>
                        {formatDistance(academy.distanceKm)}
                      </span>
                    ) : academy.locationScore > 0 && (
                      <span style={{ display: 'inline-block', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0D9E6E', border: '1px solid #0D9E6E', padding: '0.1rem 0.35rem', marginBottom: '0.3rem' }}>
                        MESMA REGIAO
                      </span>
                    )}
                    {(academy.academyCity || academy.academyState) && (
                      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={13} style={{ color: '#666', flexShrink: 0 }} />
                        <span>{[academy.academyCity, academy.academyState].filter(Boolean).join(' - ')}</span>
                      </p>
                    )}
                  </div>
                  <Info size={16} style={{ color: '#444', flexShrink: 0 }} />
                </button>

                {/* Botões de ação — largura total, separados da área de info */}
                <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #1A1A1A' }}>
                  {academy.trialRequestsEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => handleTrialRequest(academy)}
                      disabled={requestingTrial === academy.professorUid}
                      style={{
                        background: requestingTrial === academy.professorUid ? '#1A1A1A' : '#0D9E6E',
                        border: 'none',
                        borderBottom: '1px solid #1A1A1A',
                        color: requestingTrial === academy.professorUid ? '#555' : '#03140D',
                        fontFamily: 'Barlow Condensed, sans-serif',
                        fontWeight: 900,
                        fontSize: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        padding: '0.875rem 1rem',
                        minHeight: '52px',
                        cursor: requestingTrial === academy.professorUid ? 'not-allowed' : 'pointer',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: requestingTrial === academy.professorUid ? 0.65 : 1,
                      }}
                    >
                      <CalendarPlus size={18} />
                      {requestingTrial === academy.professorUid ? 'SOLICITANDO...' : 'AULA GRÁTIS'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleLink(academy)}
                    disabled={linking === academy.professorUid}
                    style={{
                      background: linking === academy.professorUid ? '#1A1A1A' : '#CC0000',
                      border: 'none',
                      color: linking === academy.professorUid ? '#555' : '#FFFFFF',
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 900,
                      fontSize: '1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '0.875rem 1rem',
                      minHeight: '52px',
                      cursor: linking === academy.professorUid ? 'not-allowed' : 'pointer',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <LinkIcon size={18} />
                    {linking === academy.professorUid ? 'VINCULANDO...' : 'VINCULAR À ACADEMIA'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAcademy && (() => {
        const addressLabel = getAddressLabel(selectedAcademy);
        const whatsappUrl = getWhatsAppUrl(selectedAcademy);
        const phoneLabel = selectedAcademy.phone || 'Numero nao informado';
        const mapActions = [
          { label: 'GOOGLE MAPS', url: getGoogleMapsUrl(selectedAcademy), icon: Navigation, color: '#1A6ECC' },
          { label: 'WAZE', url: getWazeUrl(selectedAcademy), icon: MapPin, color: '#0D9E6E' },
          { label: 'UBER', url: getUberUrl(selectedAcademy), icon: Car, color: '#FFFFFF' },
          { label: '99', url: getNinetyNineUrl(), icon: Car, color: '#FFD000' },
        ];

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes de ${selectedAcademy.academyName}`}
            onClick={() => setSelectedAcademy(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0, 0, 0, 0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <div
              onClick={event => event.stopPropagation()}
              style={{
                width: 'min(560px, 100%)',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#0D0D0D',
                border: '1px solid #2A2A2A',
                borderTop: '3px solid #CC0000',
                boxShadow: '0 24px 70px rgba(0, 0, 0, 0.55)',
              }}
            >
              <div style={{ padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.875rem', borderBottom: '1px solid #1E1E1E' }}>
                <div style={{ width: '58px', height: '58px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #CC0000', flexShrink: 0, background: '#1A0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedAcademy.academyLogoUrl ? (
                    <img src={selectedAcademy.academyLogoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <School size={26} style={{ color: '#CC0000' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.05 }}>
                    {selectedAcademy.academyName}
                  </p>
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8rem', color: '#777', marginTop: '0.35rem', lineHeight: 1.35 }}>
                    {addressLabel || 'Endereco nao informado'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAcademy(null)}
                  aria-label="Fechar"
                  style={{
                    width: '34px',
                    height: '34px',
                    flexShrink: 0,
                    border: '1px solid #2A2A2A',
                    background: '#111',
                    color: '#FFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.625rem' }}>
                  <div style={{ border: '1px solid #1E1E1E', background: '#111', padding: '0.875rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone size={13} /> NUMERO
                    </p>
                    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <p style={{ flex: 1, minWidth: '160px', fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: selectedAcademy.phone ? '#FFF' : '#666' }}>
                        {phoneLabel}
                      </p>
                      {whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#0D9E6E',
                            color: '#001A10',
                            textDecoration: 'none',
                            fontFamily: 'Barlow Condensed, sans-serif',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            padding: '0.55rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <MessageCircle size={15} /> WHATSAPP
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          style={{
                            background: '#1A1A1A',
                            border: '1px solid #2A2A2A',
                            color: '#555',
                            fontFamily: 'Barlow Condensed, sans-serif',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            padding: '0.55rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <MessageCircle size={15} /> WHATSAPP
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ border: '1px solid #1E1E1E', background: '#111', padding: '0.875rem' }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={13} /> ENDERECO
                    </p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: addressLabel ? '#FFF' : '#666', lineHeight: 1.45 }}>
                      {addressLabel || 'Endereco nao informado'}
                    </p>
                  </div>
                </div>

                <div style={{ border: '1px solid #1E1E1E', background: '#111', overflow: 'hidden' }}>
                  <iframe
                    title={`Mapa de ${selectedAcademy.academyName}`}
                    src={getMapEmbedUrl(selectedAcademy)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    style={{ width: '100%', height: '220px', border: 'none', display: 'block', background: '#0A0A0A' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.625rem' }}>
                  {mapActions.map(action => {
                    const Icon = action.icon;
                    return (
                      <a
                        key={action.label}
                        href={action.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          minHeight: '44px',
                          background: '#151515',
                          border: '1px solid #2A2A2A',
                          color: action.color,
                          textDecoration: 'none',
                          fontFamily: 'Barlow Condensed, sans-serif',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          padding: '0.65rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Icon size={15} />
                        {action.label}
                        <ExternalLink size={12} style={{ color: '#555' }} />
                      </a>
                    );
                  })}
                </div>

                {selectedAcademy.trialRequestsEnabled !== false && (
                  <button
                    onClick={() => handleTrialRequest(selectedAcademy)}
                    disabled={requestingTrial === selectedAcademy.professorUid}
                    style={{
                      background: requestingTrial === selectedAcademy.professorUid ? '#1A1A1A' : '#0D9E6E',
                      border: 'none',
                      color: '#03140D',
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 900,
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '0.875rem 1rem',
                      cursor: requestingTrial === selectedAcademy.professorUid ? 'not-allowed' : 'pointer',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      opacity: requestingTrial === selectedAcademy.professorUid ? 0.65 : 1,
                    }}
                  >
                    {requestingTrial === selectedAcademy.professorUid ? 'SOLICITANDO...' : <><CalendarPlus size={16} /> SOLICITAR AULA GRATIS</>}
                  </button>
                )}

                <button
                  onClick={() => handleLink(selectedAcademy)}
                  disabled={linking === selectedAcademy.professorUid}
                  style={{
                    background: linking === selectedAcademy.professorUid ? '#333' : '#CC0000',
                    border: 'none',
                    color: '#FFFFFF',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 900,
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '0.875rem 1rem',
                    cursor: linking === selectedAcademy.professorUid ? 'not-allowed' : 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {linking === selectedAcademy.professorUid ? 'VINCULANDO...' : <><LinkIcon size={16} /> VINCULAR A ESTA ACADEMIA</>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
