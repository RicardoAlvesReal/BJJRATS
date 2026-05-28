// BJJRats PWA — Professores
// Lista professores cadastrados com busca por nome/academia/cidade

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { BELT_COLORS } from '@/lib/bjjrats-constants';

export default function Professores() {
  const [profs, setProfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.users.list({ role: 'professor' }) as any[];
        setProfs(data);
      } catch {
        setProfs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const q = search.toLowerCase();
  const filtered = profs.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.academy || '').toLowerCase().includes(q) ||
    (p.academyName || '').toLowerCase().includes(q) ||
    (p.academyCity || '').toLowerCase().includes(q)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}
    >
      <div className="bjj-search-header">
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Buscar professor por nome, academia ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bjj-input"
          />
        </div>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', color: '#444', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', padding: '2rem' }}>
          CARREGANDO...
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👨‍🏫</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>
            {search ? 'NENHUM PROFESSOR ENCONTRADO' : 'NENHUM PROFESSOR CADASTRADO'}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(prof => {
          const beltColor = BELT_COLORS[prof.belt] || '#FFFFFF';
          return (
            <div key={prof.uid} className="bjj-card" style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden',
                border: `2px solid ${beltColor}`, flexShrink: 0, background: '#1A1A1A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {prof.photo ? (
                  <img src={prof.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', color: beltColor }}>
                    {(prof.name || '?')[0]}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: '#FFF' }}>
                  {prof.name}
                </p>
                <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: beltColor }}>
                  Faixa {prof.belt}
                </p>
                {(prof.academyName || prof.academy) && (
                  <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.7rem', color: '#666', marginTop: '0.125rem' }}>
                    {prof.academyName || prof.academy}{prof.academyCity ? ` · ${prof.academyCity}` : ''}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
