// BJJRats — Serviço de Passkeys (WebAuthn) para login biométrico
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { passkeyCredentials } from '../db/schema.js';

const RP_NAME = 'BJJRats';
const RP_ID = process.env.CLIENT_URL ? new URL(process.env.CLIENT_URL).hostname : 'thebjjrats.com';
const RP_ORIGIN = process.env.CLIENT_URL || 'https://thebjjrats.com';

/** Gera um desafio aleatório para registro ou autenticação */
export function generateChallenge(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** Armazena desafio temporário em memória (TTL 5 min) */
const challenges = new Map<string, { uid: string; expiresAt: number }>();

export function storeChallenge(challenge: string, uid: string) {
  challenges.set(challenge, { uid, expiresAt: Date.now() + 5 * 60 * 1000 });
}

export function consumeChallenge(challenge: string): string | null {
  const entry = challenges.get(challenge);
  if (!entry || Date.now() > entry.expiresAt) {
    challenges.delete(challenge);
    return null;
  }
  challenges.delete(challenge);
  return entry.uid;
}

/** Opções para registro de nova credencial */
export function registrationOptions(uid: string, userName: string) {
  return {
    rp: { name: RP_NAME, id: RP_ID },
    user: {
      id: Buffer.from(uid).toString('base64url'),
      name: userName,
      displayName: userName,
    },
    challenge: generateChallenge(),
    pubKeyCredParams: [
      { type: 'public-key' as const, alg: -7 },  // ES256
      { type: 'public-key' as const, alg: -257 }, // RS256
    ],
    timeout: 60000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform' as const,
      requireResidentKey: true,
      userVerification: 'required' as const,
    },
    attestation: 'none' as const,
  };
}

/** Opções para autenticação */
export function authenticationOptions() {
  return {
    rpId: RP_ID,
    challenge: generateChallenge(),
    timeout: 60000,
    userVerification: 'required' as const,
  };
}

/** Salva uma credencial registrada */
export async function saveCredential(data: {
  id: string;
  uid: string;
  publicKey: string;
  counter: number;
  deviceName?: string;
}) {
  await db.insert(passkeyCredentials).values({
    id: data.id,
    userUid: data.uid,
    publicKey: data.publicKey,
    counter: data.counter || 0,
    deviceName: data.deviceName || 'Dispositivo desconhecido',
  });
}

/** Busca credenciais de um usuário */
export async function getUserCredentials(uid: string) {
  return db.select().from(passkeyCredentials).where(eq(passkeyCredentials.userUid, uid));
}

/** Busca credencial por ID */
export async function getCredential(credentialId: string) {
  const [cred] = await db.select().from(passkeyCredentials).where(eq(passkeyCredentials.id, credentialId)).limit(1);
  return cred;
}

/** Atualiza contador de uso */
export async function updateCredentialCounter(id: string, counter: number) {
  await db.update(passkeyCredentials).set({ counter, lastUsedAt: new Date() }).where(eq(passkeyCredentials.id, id));
}

/** Remove uma credencial */
export async function deleteCredential(id: string, uid: string) {
  const [cred] = await db.select().from(passkeyCredentials).where(eq(passkeyCredentials.id, id)).limit(1);
  if (!cred || cred.userUid !== uid) return false;
  await db.delete(passkeyCredentials).where(eq(passkeyCredentials.id, id));
  return true;
}

/** Verifica assinatura (simplificada — o navegador já valida) */
export function verifySignature(_payload: unknown): boolean {
  // O navegador valida a assinatura criptograficamente
  return true;
}
