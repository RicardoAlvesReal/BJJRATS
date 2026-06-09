// Asaas payment gateway service

const DEV_MODE = process.env.NODE_ENV === 'development' && !process.env.ASAAS_API_KEY;

const ASAAS_BASE = process.env.ASAAS_SANDBOX === 'true'
  ? 'https://api-sandbox.asaas.com/v3'
  : 'https://api.asaas.com/v3';

const API_KEY = process.env.ASAAS_API_KEY || '';

async function request<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (DEV_MODE) {
    throw new Error('Asaas request attempted in dev mode without ASAAS_API_KEY');
  }
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'BJJRats/1.0.0',
      access_token: API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asaas ${method} ${path} ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  status: string;
  cycle: string;
  deleted: boolean;
}

export interface AsaasPayment {
  id: string;
  subscription?: string | null;
  value: number;
  netValue: number;
  dueDate: string;
  status: string;
  billingType: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  pixQrCode?: string;
}

// ─── Customers ─────────────────────────────────────────────────────────────

export async function createCustomer(data: {
  name: string; email: string; cpfCnpj?: string; phone?: string;
}): Promise<AsaasCustomer> {
  if (DEV_MODE) {
    return { id: `dev-cus-${Date.now()}`, name: data.name, email: data.email, cpfCnpj: data.cpfCnpj };
  }
  return request<AsaasCustomer>('POST', '/customers', {
    name: data.name,
    email: data.email,
    cpfCnpj: data.cpfCnpj,
    phone: data.phone,
  });
}

export async function findCustomer(email: string): Promise<AsaasCustomer | null> {
  if (DEV_MODE) return null;
  const result = await request<{ data: AsaasCustomer[] }>('GET', `/customers?email=${encodeURIComponent(email)}`);
  return result.data?.[0] ?? null;
}

// ─── Subscriptions ─────────────────────────────────────────────────────────

export async function createSubscription(data: {
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY' | 'YEARLY';
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  description?: string;
  maxPayments?: number;
  externalReference?: string;
}): Promise<AsaasSubscription> {
  if (DEV_MODE) {
    return {
      id: `dev-sub-${Date.now()}`,
      customer: data.customer,
      billingType: data.billingType,
      value: data.value,
      nextDueDate: data.nextDueDate,
      status: 'ACTIVE',
      cycle: data.cycle,
      deleted: false,
    };
  }
  return request<AsaasSubscription>('POST', '/subscriptions', {
    customer: data.customer,
    value: data.value,
    nextDueDate: data.nextDueDate,
    cycle: data.cycle,
    billingType: data.billingType,
    description: data.description,
    maxPayments: data.maxPayments,
    externalReference: data.externalReference,
  });
}

export async function getSubscription(id: string): Promise<AsaasSubscription> {
  return request<AsaasSubscription>('GET', `/subscriptions/${id}`);
}

export async function cancelSubscription(id: string): Promise<AsaasSubscription> {
  if (DEV_MODE) {
    return { id, customer: '', billingType: 'PIX', value: 0, nextDueDate: '', status: 'CANCELLED', cycle: 'MONTHLY', deleted: true };
  }
  return request<AsaasSubscription>('DELETE', `/subscriptions/${id}`);
}

// ─── Payments (for a subscription) ─────────────────────────────────────────

export async function listSubscriptionPayments(subscriptionId: string): Promise<AsaasPayment[]> {
  if (DEV_MODE) return [];
  const result = await request<{ data: AsaasPayment[] }>('GET', `/subscriptions/${subscriptionId}/payments`);
  return result.data ?? [];
}

// ─── Webhook helpers ───────────────────────────────────────────────────────

export interface AsaasWebhookEvent {
  event: string;
  payment?: AsaasPayment;
  subscription?: AsaasSubscription;
}

export function parseWebhook(body: unknown): AsaasWebhookEvent {
  return body as AsaasWebhookEvent;
}
