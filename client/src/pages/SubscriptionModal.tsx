// BJJRats — Modal de assinatura (overlay + portal)

import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import SubscriptionManager from './SubscriptionManager';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({ open, onClose }: Props) {
  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 10000, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111', border: '1px solid #222',
          borderRadius: '8px', maxWidth: '480px', width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <SubscriptionManager compact />
      </motion.div>
    </div>,
    document.body
  );
}
