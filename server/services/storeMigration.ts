import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { subscriptions } from '../db/schema.js';
import { cancelSubscription as asaasCancelSubscription } from './asaas.js';

type Subscription = typeof subscriptions.$inferSelect;
export type StoreProvider = 'apple' | 'google_play';

const ASAAS_CANCEL_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout após ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/** Assinatura cobrada pelo Asaas que deve ser encerrada ao migrar para uma loja (Apple / Google Play). */
export function hasActiveAsaasBilling(sub: Subscription | null | undefined, store: StoreProvider): sub is Subscription {
  return Boolean(sub?.asaasId && sub.provider !== store);
}

/**
 * Encerra a cobrança recorrente no Asaas e marca o registro local como cancelado,
 * para que o usuário não seja cobrado em duplicidade ao assinar pela loja.
 *
 * - O registro antigo é mantido (com asaasId) como histórico; a loja cria um registro novo.
 * - Falha no Asaas NÃO bloqueia a ativação pela loja (o usuário já pagou à Apple/Google),
 *   mas é registrada com a tag [AÇÃO MANUAL] para o admin cancelar no painel do Asaas.
 */
export async function retireAsaasSubscription(
  sub: Subscription,
  store: StoreProvider,
): Promise<{ asaasCancelled: boolean; error?: string }> {
  const asaasId = sub.asaasId!;
  let asaasCancelled = false;
  let error: string | undefined;

  try {
    await withTimeout(asaasCancelSubscription(asaasId), ASAAS_CANCEL_TIMEOUT_MS);
    asaasCancelled = true;
    console.log(`[StoreMigration] Assinatura Asaas ${asaasId} cancelada (usuário ${sub.userUid} migrou para ${store}).`);
  } catch (err: any) {
    const errorMsg = err?.message || String(err || '');
    error = errorMsg;
    if (/\s404:/.test(errorMsg)) {
      // Já removida no Asaas
      asaasCancelled = true;
      console.log(`[StoreMigration] Assinatura Asaas ${asaasId} já não existia no Asaas.`);
    } else {
      console.error(
        `[StoreMigration][AÇÃO MANUAL] Falha ao cancelar assinatura Asaas ${asaasId} do usuário ${sub.userUid} ` +
        `ao migrar para ${store}. Cancele manualmente no painel do Asaas para evitar cobrança dupla. Erro: ${error}`,
      );
    }
  }

  await db
    .update(subscriptions)
    .set({ status: 'cancelled', cancelledAt: new Date() })
    .where(eq(subscriptions.id, sub.id));

  return { asaasCancelled, error };
}
