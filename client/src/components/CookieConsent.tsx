// BJJRats — Banner de consentimento de cookies (LGPD)
import { useState, useEffect } from 'react';

const CONSENT_KEY = 'bjjrats_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Só mostra se ainda não aceitou
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#0D0D0D',
      borderTop: '1px solid #CC0000',
      padding: '1rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      flexWrap: 'wrap',
    }}>
      <p style={{
        fontFamily: 'Barlow, sans-serif',
        fontSize: '0.8rem',
        color: '#888',
        margin: 0,
        maxWidth: '560px',
        lineHeight: 1.5,
      }}>
        🍪 Usamos cookies essenciais para autenticação e segurança.{' '}
        <a href="/privacy-policy" style={{ color: '#CC0000', textDecoration: 'underline', fontWeight: 600 }}>
          Saiba mais
        </a>
      </p>
      <button
        onClick={accept}
        style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontWeight: 900,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          background: '#CC0000',
          color: '#FFF',
          border: 'none',
          padding: '0.6rem 1.5rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FF0000')}
        onMouseLeave={e => (e.currentTarget.style.background = '#CC0000')}
      >
        OK, entendi
      </button>
    </div>
  );
}
