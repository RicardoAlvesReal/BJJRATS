// BJJRats PWA — AcademySearch
// Design: "Cage Fighter" — Brutalismo Tático
// Permite ao aluno buscar academias cadastradas por professores e solicitar vínculo

import { useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AcademyResult {
  professorUid: string;
  academyName: string;
  academyCity: string;
  academyState: string;
  academyAddress?: string;
  academyLogoUrl?: string;
  professorPhotoUrl?: string;
  professorName: string;
}

interface Props {
  onBack: () => void;
  onLinked: () => void;
}

export default function AcademySearch({ onBack, onLinked }: Props) {
  const { user, updateProfileData, refreshProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AcademyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const term = search.trim().toLowerCase();
    if (!term) { toast.error('Digite o nome ou cidade da academia'); return; }
    setLoading(true);
    setSearched(true);
    try {
      const professors = await api.users.list({ role: 'professor' }) as any[];
      const all: AcademyResult[] = professors
        .map(data => ({
          professorUid: data.uid,
          academyName: data.academyName || data.academy || '',
          academyCity: data.academyCity || '',
          academyState: data.academyState || '',
          academyAddress: data.academyAddress || '',
          academyLogoUrl: data.academyLogoUrl || '',
          professorPhotoUrl: data.professorPhotoUrl || data.photo || '',
          professorName: data.name || '',
        }))
        .filter(a =>
          a.academyName.toLowerCase().includes(term) ||
          a.academyCity.toLowerCase().includes(term) ||
          a.professorName.toLowerCase().includes(term)
        );
      setResults(all);
    } catch {
      toast.error('Erro ao buscar academias');
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (academy: AcademyResult) => {
    if (!user) return;
    setLinking(academy.professorUid);
    try {
      const studentName = user.name || 'Novo aluno';
      const studentBelt = user.belt || 'Branca';
      const studentStripes = user.stripes ?? 0;
      const studentPhoto = user.photo || null;

      await api.academyRequests.create({
        studentUid: user.uid,
        studentName,
        studentBelt,
        studentStripes,
        studentPhoto,
        professorUid: academy.professorUid,
        academyName: academy.academyName,
        professorName: academy.professorName,
        status: 'pending',
        createdAtStr: new Date().toLocaleDateString('pt-BR'),
      });

      await api.notifications.create({
        toUid: academy.professorUid,
        fromUid: user.uid,
        type: 'join_request',
        title: 'Nova solicitação de vínculo',
        message: `${studentName} (Faixa ${studentBelt}) quer se vincular à sua academia.`,
        read: false,
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
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#CC0000', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.05em' }}>
          BUSCAR ACADEMIA
        </h1>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {/* Instrução */}
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#888', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Busque pelo nome da academia, cidade ou nome do professor para se vincular.
        </p>

        {/* Campo de busca */}
        <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem' }}>
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
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? '...' : 'BUSCAR'}
          </button>
        </div>

        {/* Resultados */}
        {searched && !loading && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>
              NENHUMA ACADEMIA ENCONTRADA
            </p>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#444', marginTop: '0.5rem' }}>
              Tente buscar por outro nome ou cidade
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
                    <span style={{ fontSize: '1.5rem' }}>🏫</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', color: '#FFFFFF', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>
                    {academy.academyName || 'Academia sem nome'}
                  </p>
                  {(academy.academyCity || academy.academyState) && (
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#888', marginBottom: '0.25rem' }}>
                      📍 {[academy.academyCity, academy.academyState].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.8125rem', color: '#666', marginBottom: '0.875rem' }}>
                    👤 Prof. {academy.professorName}
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
                    }}
                  >
                    {linking === academy.professorUid ? 'VINCULANDO...' : '🔗 VINCULAR À ESTA ACADEMIA'}
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
