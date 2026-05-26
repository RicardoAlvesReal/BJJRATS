// Asaas payment gateway service

const ASAAS_BASE = process.env.ASAAS_SANDBOX === 'true'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://www.asaas.com/api/v3';

const API_KEY = process.env.ASAAS_API_KEY || '';

async function request<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
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
  subscription: string;
  value: number;
  netValue: number;
  dueDate: string;
  status: string;
  billingType: string;
  invoiceUrl?: string;
  pixQrCode?: string;
}

// ─── Customers ─────────────────────────────────────────────────────────────

export async function createCustomer(data: {
  name: string; email: string; cpfCnpj?: string; phone?: string;
}): Promise<AsaasCustomer> {
  return request<AsaasCustomer>('POST', '/customers', {
    name: data.name,
    email: data.email,
    cpfCnpj: data.cpfCnpj,
    phone: data.phone,
  });
}

export async function findCustomer(email: string): Promise<AsaasCustomer | null> {
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
  return request<AsaasSubscription>('DELETE', `/subscriptions/${id}`);
}

// ─── Payments (for a subscription) ─────────────────────────────────────────

export async function listSubscriptionPayments(subscriptionId: string): Promise<AsaasPayment[]> {
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
