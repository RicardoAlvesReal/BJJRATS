import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import type { Announcement } from '@/lib/api';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.announcements.list()
      .then(setAnnouncements)
      .catch(() => {});
  }, []);

  const handleDismiss = async (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    try {
      await api.announcements.dismiss(id);
    } catch {}
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 px-4 pt-3 pb-1">
      <AnimatePresence>
        {visible.map(a => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              background: 'linear-gradient(135deg, #CC0000 0%, #8B0000 100%)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              position: 'relative',
              overflow: 'hidden',
            }}>
            {a.imageUrl && (
              <img src={a.imageUrl} alt=""
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', opacity: 0.15, pointerEvents: 'none',
                }} />
            )}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[0.8rem] font-black font-['Barlow_Condensed'] tracking-[0.06em] uppercase">
                    {a.title}
                  </p>
                  <p className="text-[rgba(255,255,255,0.85)] text-[0.75rem] font-['Barlow'] mt-0.5 leading-snug">
                    {a.content}
                  </p>
                  {a.linkUrl && (
                    <a href={a.linkUrl} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#FFF',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '6px',
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                        fontFamily: 'Barlow Condensed, sans-serif',
                      }}>
                      {a.linkText || 'Saiba mais'}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDismiss(a.id)}
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#FFF',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
