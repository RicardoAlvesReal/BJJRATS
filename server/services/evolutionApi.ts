// Evolution API service — WhatsApp automation
// Docs: https://doc.evolution-api.com

import QRCode from 'qrcode';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

function getInstanceName(professorUid: string): string {
  return `bjjrats_${professorUid}`;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  timeoutMs = 30000,
): Promise<T> {
  if (!EVOLUTION_API_URL) {
    throw new Error('EVOLUTION_API_URL not configured');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Evolution API ${method} ${path} ${res.status}: ${text}`);
    }
    if (!text.trim()) {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  } finally {
    clearTimeout(timeout);
  }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes(' 404:') ||
    /not found|does not exist|n[aã]o encontrada|n[aã]o existe/i.test(error.message)
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface InstanceCreateResponse {
  instance: {
    instanceName: string;
    status: string;
  };
  hash?: string | {
    pairingCode?: string;
    qrcode?: {
      code: string;
      base64: string;
    };
  };
  qrcode?: {
    pairingCode?: string;
    code?: string;
    base64?: string;
    count?: number;
  };
}

export interface InstanceConnectResponse {
  base64?: string;
  code?: string;
  pairingCode?: string;
  count?: number;
}

export interface WhatsAppConnectionPayload {
  qrcode: string | null;
  qrCodeText: string | null;
  pairingCode: string | null;
}

export interface InstanceStateResponse {
  instance: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
    ownerJid?: string;
  };
}

export interface MessageSendResponse {
  key: {
    id: string;
    remoteJid: string;
  };
  message: Record<string, unknown>;
}

export async function createInstance(
  professorUid: string,
  options: { qrcode?: boolean } = {},
): Promise<InstanceCreateResponse> {
  const instanceName = getInstanceName(professorUid);
  return request<InstanceCreateResponse>('POST', '/instance/create', {
    instanceName,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: options.qrcode ?? true,
  });
}

function normalizeCountryCode(countryCode?: string): string {
  const digits = String(countryCode || '55').replace(/\D/g, '');
  return digits || '55';
}

export function formatPairingPhone(phone: string, countryCode?: string): string {
  const raw = phone.trim();
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Evolution/WhatsApp pairing expects the number with country code.
  // If the user typed an international number explicitly, keep it as-is.
  if (raw.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);

  const dialCode = normalizeCountryCode(countryCode);
  if (digits.startsWith(dialCode) && digits.length > dialCode.length + 6) {
    return digits;
  }

  return `${dialCode}${digits}`;
}

export async function getPairingCode(professorUid: string, phone: string, countryCode?: string): Promise<InstanceConnectResponse> {
  const instanceName = getInstanceName(professorUid);
  const formattedPhone = formatPairingPhone(phone, countryCode);
  return request<InstanceConnectResponse>('GET', `/instance/connect/${instanceName}?number=${encodeURIComponent(formattedPhone)}`, undefined, 45000);
}

export async function connectInstance(professorUid: string): Promise<InstanceConnectResponse> {
  const instanceName = getInstanceName(professorUid);
  return request<InstanceConnectResponse>('GET', `/instance/connect/${instanceName}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringPath(source: unknown, paths: string[]): string | null {
  for (const path of paths) {
    let current: unknown = source;
    for (const part of path.split('.')) {
      if (!isRecord(current)) {
        current = undefined;
        break;
      }
      current = current[part];
    }
    if (typeof current === 'string' && current.trim()) {
      return current.trim();
    }
  }
  return null;
}

function normalizeQrImage(value: string | null): string | null {
  if (!value) return null;
  const compact = value.trim().replace(/\s/g, '');
  if (!compact) return null;
  if (compact.startsWith('data:image/')) return compact;

  // Evolution versions may return only the image base64. Raw QR payloads contain
  // characters such as "@" and must be rendered with QRCode.toDataURL instead.
  const looksLikeImageBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(compact) && compact.length > 100;
  return looksLikeImageBase64 ? `data:image/png;base64,${compact}` : null;
}

export async function toConnectionPayload(source: unknown): Promise<WhatsAppConnectionPayload> {
  const base64Image = getStringPath(source, [
    'base64',
    'qrcode.base64',
    'qr.base64',
    'hash.qrcode.base64',
  ]);
  const qrCodeText = getStringPath(source, [
    'code',
    'qrcode.code',
    'qr.code',
    'hash.qrcode.code',
  ]);
  const pairingCode = getStringPath(source, [
    'pairingCode',
    'pairing_code',
    'hash.pairingCode',
    'hash.pairing_code',
  ]);

  let qrcode = normalizeQrImage(base64Image);
  if (!qrcode && qrCodeText) {
    qrcode = await QRCode.toDataURL(qrCodeText, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }

  return {
    qrcode,
    qrCodeText,
    pairingCode,
  };
}

export async function getPairingConnectionPayload(
  professorUid: string,
  phone: string,
  countryCode?: string,
): Promise<WhatsAppConnectionPayload> {
  let lastPayload: WhatsAppConnectionPayload = {
    qrcode: null,
    qrCodeText: null,
    pairingCode: null,
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const result = await getPairingCode(professorUid, phone, countryCode);
    lastPayload = await toConnectionPayload(result);
    if (lastPayload.pairingCode) {
      return lastPayload;
    }
    await delay(1000);
  }

  return lastPayload;
}

export async function getCurrentConnectionPayload(
  professorUid: string,
  phone?: string,
  countryCode?: string,
): Promise<WhatsAppConnectionPayload> {
  const formattedPhone = phone ? formatPairingPhone(phone, countryCode) : '';
  if (formattedPhone.length >= 10) {
    return getPairingConnectionPayload(professorUid, formattedPhone, countryCode);
  }

  const result = await connectInstance(professorUid);
  return toConnectionPayload(result);
}

export async function getConnectionState(instanceName: string): Promise<InstanceStateResponse> {
  return request<InstanceStateResponse>('GET', `/instance/connectionState/${instanceName}`);
}

export async function logoutInstanceByName(instanceName: string): Promise<void> {
  try {
    await request('DELETE', `/instance/logout/${instanceName}`);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }
}

export async function deleteInstanceByName(instanceName: string): Promise<void> {
  try {
    await request('DELETE', `/instance/delete/${instanceName}`);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }
}

export async function ensureInstanceDeletedByName(instanceName: string): Promise<void> {
  try {
    await logoutInstanceByName(instanceName);
  } catch {
    // Deleting works for closed sessions too; logout is just a best-effort cleanup.
  }

  await deleteInstanceByName(instanceName);

  for (let attempt = 0; attempt < 5; attempt++) {
    await delay(500);
    try {
      const state = await getConnectionState(instanceName);
      if (attempt === 4) {
        throw new Error(`Evolution API manteve a instÃ¢ncia "${instanceName}" apÃ³s delete (state: ${state.instance?.state ?? 'desconhecido'})`);
      }
      await deleteInstanceByName(instanceName);
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }
      throw error;
    }
  }
}

export async function logoutInstance(professorUid: string): Promise<void> {
  return logoutInstanceByName(getInstanceName(professorUid));
}

export async function deleteInstance(professorUid: string): Promise<void> {
  return ensureInstanceDeletedByName(getInstanceName(professorUid));
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

export async function sendMessage(
  professorUid: string,
  phone: string,
  message: string,
): Promise<MessageSendResponse> {
  const instanceName = getInstanceName(professorUid);
  const number = formatPhone(phone);
  const text = String(message || '').trim();
  if (!number) throw new Error('Numero de WhatsApp invalido');
  if (!text) throw new Error('Mensagem de WhatsApp vazia');
  return request<MessageSendResponse>('POST', `/message/sendText/${instanceName}`, {
    number,
    text,
    textMessage: { text },
  });
}
