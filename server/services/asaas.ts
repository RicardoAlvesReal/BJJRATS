// Asaas payment gateway service

export type AsaasRequestConfig = {
  apiKey?: string | null;
  sandbox?: boolean;
};

function getApiKey(config?: AsaasRequestConfig) {
  return config?.apiKey || process.env.ASAAS_API_KEY || '';
}

function getBaseUrl(config?: AsaasRequestConfig) {
  const sandbox = config?.sandbox ?? process.env.ASAAS_SANDBOX === 'true';
  return sandbox ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
}

function isDevMode(config?: AsaasRequestConfig) {
  return process.env.NODE_ENV === 'development' && !getApiKey(config);
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  config?: AsaasRequestConfig,
): Promise<T> {
  if (isDevMode(config)) {
    throw new Error('Asaas request attempted in dev mode without ASAAS_API_KEY');
  }
  const res = await fetch(`${getBaseUrl(config)}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'BJJRats/1.0.0',
      access_token: getApiKey(config),
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
  pixQrCodeUrl?: string;
  pixCopiaECola?: string;
  payload?: string;
  pixTransaction?: string;
  externalReference?: string;
}

// ─── Customers ─────────────────────────────────────────────────────────────

export async function createCustomer(data: {
  name: string; email: string; cpfCnpj?: string; phone?: string;
}, config?: AsaasRequestConfig): Promise<AsaasCustomer> {
  if (isDevMode(config)) {
    return { id: `dev-cus-${Date.now()}`, name: data.name, email: data.email, cpfCnpj: data.cpfCnpj };
  }
  return request<AsaasCustomer>('POST', '/customers', {
    name: data.name,
    email: data.email,
    cpfCnpj: data.cpfCnpj,
    phone: data.phone,
  }, config);
}

export async function findCustomer(email: string, config?: AsaasRequestConfig): Promise<AsaasCustomer | null> {
  if (isDevMode(config)) return null;
  const result = await request<{ data: AsaasCustomer[] }>('GET', `/customers?email=${encodeURIComponent(email)}`, undefined, config);
  return result.data?.[0] ?? null;
}

export async function updateCustomer(id: string, data: { cpfCnpj?: string; phone?: string }, config?: AsaasRequestConfig): Promise<AsaasCustomer> {
  if (isDevMode(config)) return { id, name: '', email: '', cpfCnpj: data.cpfCnpj };
  return request<AsaasCustomer>('PUT', `/customers/${id}`, data, config);
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
}, config?: AsaasRequestConfig): Promise<AsaasSubscription> {
  if (isDevMode(config)) {
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
  }, config);
}

export async function getSubscription(id: string, config?: AsaasRequestConfig): Promise<AsaasSubscription> {
  return request<AsaasSubscription>('GET', `/subscriptions/${id}`, undefined, config);
}

export async function cancelSubscription(id: string, config?: AsaasRequestConfig): Promise<AsaasSubscription> {
  if (isDevMode(config)) {
    return { id, customer: '', billingType: 'PIX', value: 0, nextDueDate: '', status: 'CANCELLED', cycle: 'MONTHLY', deleted: true };
  }
  return request<AsaasSubscription>('DELETE', `/subscriptions/${id}`, undefined, config);
}

export async function updateSubscription(id: string, data: {
  billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
}, config?: AsaasRequestConfig): Promise<AsaasSubscription> {
  if (isDevMode(config)) {
    return {
      id,
      customer: '',
      billingType: data.billingType || 'PIX',
      value: 0,
      nextDueDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      cycle: 'MONTHLY',
      deleted: false,
    };
  }
  return request<AsaasSubscription>('PUT', `/subscriptions/${id}`, {
    billingType: data.billingType,
  }, config);
}

// ─── Payments (for a subscription) ─────────────────────────────────────────

export async function listSubscriptionPayments(subscriptionId: string, config?: AsaasRequestConfig): Promise<AsaasPayment[]> {
  if (isDevMode(config)) return [];
  const result = await request<{ data: AsaasPayment[] }>('GET', `/subscriptions/${subscriptionId}/payments`, undefined, config);
  return result.data ?? [];
}

export async function createPayment(data: {
  customer: string;
  value: number;
  dueDate: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  description?: string;
  externalReference?: string;
}, config?: AsaasRequestConfig): Promise<AsaasPayment> {
  if (isDevMode(config)) {
    return {
      id: `dev-pay-${Date.now()}`,
      customer: data.customer,
      value: data.value,
      netValue: data.value,
      dueDate: data.dueDate,
      status: 'PENDING',
      billingType: data.billingType,
      invoiceUrl: `https://sandbox.asaas.local/pay/${data.externalReference || Date.now()}`,
      externalReference: data.externalReference,
    } as AsaasPayment;
  }
  return request<AsaasPayment>('POST', '/payments', {
    customer: data.customer,
    value: data.value,
    dueDate: data.dueDate,
    billingType: data.billingType,
    description: data.description,
    externalReference: data.externalReference,
  }, config);
}

export interface AsaasPixQrCode {
  encodedImage: string;   // base64 PNG
  payload: string;        // copia e cola
  expirationDate: string;
}

export async function getPixQrCode(paymentId: string, config?: AsaasRequestConfig): Promise<AsaasPixQrCode> {
  if (isDevMode(config)) {
    return { encodedImage: '', payload: 'dev-pix-payload', expirationDate: new Date().toISOString() };
  }
  return request<AsaasPixQrCode>('GET', `/payments/${paymentId}/pixQrCode`, undefined, config);
}

export async function testConnection(config?: AsaasRequestConfig): Promise<void> {
  await request<{ data: AsaasCustomer[] }>('GET', '/customers?limit=1', undefined, config);
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
