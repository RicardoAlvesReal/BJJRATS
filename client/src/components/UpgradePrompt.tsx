import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { Crown, LockKeyhole, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { getFeatureLabel } from '@/lib/features';
import { FONTS } from '@/lib/design';

const UPGRADE_EVENT = 'bjjrats:upgrade-required';

export function requestUpgrade(featureKey?: string) {
  window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, {
    detail: { featureKey: featureKey || null },
  }));
}

export function useUpgradePrompt() {
  const [featureKey, setFeatureKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleUpgradeRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ featureKey?: string | null }>).detail;
      setFeatureKey(detail?.featureKey || null);
      setOpen(true);
    };
    window.addEventListener(UPGRADE_EVENT, handleUpgradeRequest);
    return () => window.removeEventListener(UPGRADE_EVENT, handleUpgradeRequest);
  }, []);

  return {
    open,
    featureKey,
    showUpgrade: (nextFeatureKey?: string) => {
      setFeatureKey(nextFeatureKey || null);
      setOpen(true);
    },
    closeUpgrade: () => setOpen(false),
  };
}

export function FreePlanBanner({ planName, onUpgrade }: { planName?: string | null; onUpgrade: () => void }) {
  return (
    <div style={{
      width: '100%',
      background: '#151107',
      borderTop: '1px solid #5A4617',
      borderBottom: '1px solid #5A4617',
      padding: '0.65rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      flexWrap: 'wrap',
    }}>
      <Crown size={17} color="#FFD166" strokeWidth={2.4} />
      <span style={{
        color: '#D6C89B',
        fontFamily: FONTS.condensed,
        fontWeight: 700,
        fontSize: '0.75rem',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {planName || 'Plano gratuito'}: torne-se PLUS para liberar todos os recursos
      </span>
      <button
        onClick={onUpgrade}
        style={{
          background: '#FFD166',
          border: 'none',
          borderRadius: '6px',
          color: '#171006',
          cursor: 'pointer',
          fontFamily: FONTS.condensed,
          fontWeight: 900,
          fontSize: '0.68rem',
          letterSpacing: '0.08em',
          padding: '0.42rem 0.75rem',
          textTransform: 'uppercase',
        }}
      >
        Ver planos PLUS
      </button>
    </div>
  );
}

export function PlusBadge() {
  return (
    <span style={{
      display: 'inline-flex',
      marginLeft: '0.4rem',
      background: '#FFD166',
      borderRadius: '4px',
      color: '#171006',
      fontFamily: FONTS.condensed,
      fontWeight: 900,
      fontSize: '0.5rem',
      letterSpacing: '0.06em',
      lineHeight: 1,
      padding: '0.2rem 0.3rem',
    }}>
      PLUS
    </span>
  );
}

export function LockedFeaturePanel({
  featureKey,
  onUpgrade,
}: {
  featureKey?: string | null;
  onUpgrade: () => void;
}) {
  return (
    <div style={{
      minHeight: '360px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ maxWidth: '430px', textAlign: 'center' }}>
        <div style={{
          width: '58px',
          height: '58px',
          margin: '0 auto 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#211A08',
          border: '1px solid #5A4617',
          borderRadius: '8px',
        }}>
          <LockKeyhole size={26} color="#FFD166" />
        </div>
        <p style={{
          margin: '0 0 0.3rem',
          color: '#FFD166',
          fontFamily: FONTS.condensed,
          fontWeight: 900,
          fontSize: '0.68rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          Disponível no PLUS
        </p>
        <h2 style={{
          margin: 0,
          color: '#FFF',
          fontFamily: FONTS.condensed,
          fontWeight: 900,
          fontSize: '1.45rem',
          letterSpacing: 0,
          textTransform: 'uppercase',
        }}>
          {featureKey ? getFeatureLabel(featureKey) : 'Recurso exclusivo'}
        </h2>
        <p style={{
          margin: '0.65rem 0 1rem',
          color: '#777',
          fontFamily: FONTS.condensed,
          fontSize: '0.85rem',
          lineHeight: 1.45,
        }}>
          Faça upgrade do seu plano para usar esta funcionalidade.
        </p>
        <button
          onClick={onUpgrade}
          style={{
            minHeight: '42px',
            background: '#FFD166',
            border: 'none',
            borderRadius: '6px',
            color: '#171006',
            cursor: 'pointer',
            fontFamily: FONTS.condensed,
            fontWeight: 900,
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            padding: '0.65rem 1rem',
            textTransform: 'uppercase',
          }}
        >
          Tornar-se PLUS
        </button>
      </div>
    </div>
  );
}

export function UpgradeModal({
  open,
  featureKey,
  onClose,
}: {
  open: boolean;
  featureKey?: string | null;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  if (!open) return null;

  const featureLabel = featureKey ? getFeatureLabel(featureKey) : null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={event => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#101010',
          border: '1px solid #5A4617',
          borderRadius: '8px',
          boxShadow: '0 24px 70px rgba(0,0,0,0.65)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '5px', background: '#FFD166' }} />
        <div style={{ padding: '1.25rem', position: 'relative' }}>
          <button
            onClick={onClose}
            title="Fechar"
            style={{
              position: 'absolute',
              top: '0.8rem',
              right: '0.8rem',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#181818',
              border: '1px solid #2A2A2A',
              borderRadius: '6px',
              color: '#777',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>

          <div style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#211A08',
            border: '1px solid #5A4617',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            <LockKeyhole size={23} color="#FFD166" />
          </div>

          <p style={{
            margin: '0 0 0.35rem',
            color: '#FFD166',
            fontFamily: FONTS.condensed,
            fontWeight: 900,
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Recurso PLUS
          </p>
          <h2 style={{
            margin: 0,
            color: '#FFF',
            fontFamily: FONTS.condensed,
            fontWeight: 900,
            fontSize: '1.55rem',
            letterSpacing: 0,
            textTransform: 'uppercase',
          }}>
            {featureLabel || 'Libere a experiência completa'}
          </h2>
          <p style={{
            margin: '0.7rem 0 1.1rem',
            color: '#999',
            fontFamily: FONTS.condensed,
            fontSize: '0.88rem',
            lineHeight: 1.45,
          }}>
            Este recurso não está incluído no seu plano gratuito. Torne-se um usuário pagante para acessar esta e todas as funcionalidades disponíveis no seu plano PLUS.
          </p>

          <button
            onClick={() => {
              onClose();
              navigate('/pricing');
            }}
            style={{
              width: '100%',
              minHeight: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: '#FFD166',
              border: 'none',
              borderRadius: '6px',
              color: '#171006',
              cursor: 'pointer',
              fontFamily: FONTS.condensed,
              fontWeight: 900,
              fontSize: '0.82rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={16} />
            Conhecer planos PLUS
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
