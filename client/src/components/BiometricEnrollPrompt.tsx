// BJJRats — Prompt de cadastro biométrico pós-login
// Exibe um modal sugerindo ativar biometria após o primeiro login

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { passkeys } from '@/lib/api';

interface Props {
  userUid: string;
  onClose: () => void;
}

export default function BiometricEnrollPrompt({ userUid, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  const handleEnroll = async () => {
    try {
      setLoading(true);
      const options = await passkeys.registerChallenge();
      options.publicKey.user.id = base64ToBuffer(options.publicKey.user.id);
      options.publicKey.challenge = base64ToBuffer(options.publicKey.challenge);
      if (options.publicKey.excludeCredentials) {
        options.publicKey.excludeCredentials.forEach((c: any) => {
          c.id = base64ToBuffer(c.id);
        });
      }

      const credential = await navigator.credentials.create({
        publicKey: options.publicKey,
      }) as PublicKeyCredential;

      const attResp = credential.response as AuthenticatorAttestationResponse;
      await passkeys.register({
        id: credential.id,
        rawId: bufferToBase64(credential.rawId),
        response: {
          attestationObject: bufferToBase64(attResp.attestationObject),
          clientDataJSON: bufferToBase64(attResp.clientDataJSON),
          transports: (credential as any).response?.getTransports?.() || [],
        },
        type: credential.type,
      });

      toast.success('Biometria ativada! No próximo login, use sua digital ou Face ID.');
      onClose();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        toast.error('Cadastro biométrico cancelado.');
      } else {
        toast.error('Erro ao ativar biometria.');
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    try { localStorage.setItem(`biometric_prompt_dismissed_${userUid}`, '1'); } catch {}
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={handleSkip}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111', border: '1px solid #2A6B3F',
          maxWidth: '380px', width: '100%', padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔐</div>
        <h3 style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
          fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFF',
          letterSpacing: '0.05em', marginBottom: '0.5rem',
        }}>
          Entrar com biometria?
        </h3>
        <p style={{
          fontFamily: 'Barlow, sans-serif', fontSize: '0.85rem',
          color: '#888', lineHeight: 1.5, marginBottom: '1.25rem',
        }}>
          Use sua digital, Face ID ou PIN para acessar o BJJRats
          instantaneamente, sem precisar digitar a senha.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={handleEnroll}
            disabled={loading}
            style={{
              width: '100%', padding: '0.75rem',
              background: loading ? '#1C2A1C' : '#2A6B3F',
              border: '1px solid #3A8B4F', color: '#FFF',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700, fontSize: '0.9rem',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {loading ? (
              <>⏳ ATIVANDO...</>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
                  <path d="M4 22v-4c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v4"/>
                  <rect x="3" y="12" width="18" height="8" rx="1"/>
                </svg>
                ATIVAR BIOMETRIA
              </>
            )}
          </button>
          <button
            onClick={handleSkip}
            disabled={loading}
            style={{
              width: '100%', padding: '0.6rem',
              background: 'transparent', border: '1px solid #2A2A2A',
              color: '#555', fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700, fontSize: '0.8rem',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            AGORA NÃO
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Helpers Base64 ──────────────────────────────────────────────────────────

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return bytes.buffer;
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
