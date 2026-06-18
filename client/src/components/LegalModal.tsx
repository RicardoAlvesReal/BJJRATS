// BJJRats — Modal para textos legais (Termos, Privacidade)
// Exibe conteúdo sem sair da página de cadastro

import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function LegalModal({ open, title, onClose, children }: Props) {
  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      {/* Overlay escuro */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' }} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: '#111',
          border: '1px solid #222',
          borderRadius: '12px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '2px solid #CC0000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900,
            fontSize: '1.1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#FFF',
            margin: 0,
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFF')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            ✕
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1,
        }}>
          {children}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
