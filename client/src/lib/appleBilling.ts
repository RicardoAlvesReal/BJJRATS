import api from '@/lib/api';

export const APPLE_PRODUCT_IDS = {
  ALUNO: 'plano_aluno_mensal',
  PROFESSOR: 'plano_professor_mensal',
  ACADEMIA: 'plano_academia_mensal',
} as const;

export const PLAN_SLUG_TO_APPLE_PRODUCT_ID: Record<string, string> = {
  aluno: APPLE_PRODUCT_IDS.ALUNO,
  professor: APPLE_PRODUCT_IDS.PROFESSOR,
  academia: APPLE_PRODUCT_IDS.ACADEMIA,
};

/** Tempo máximo aguardando a App Store aprovar e o backend validar a compra */
const PURCHASE_TIMEOUT_MS = 120_000;

export interface ApplePurchaseResult {
  success: boolean;
  /** true quando a compra pode ainda ser concluída depois (ex.: Ask to Buy, demora da App Store) */
  pending?: boolean;
  status?: string;
  error?: string;
}

interface PendingPurchase {
  productId: string;
  resolve: (result: ApplePurchaseResult) => void;
  timeout: ReturnType<typeof setTimeout>;
}

let initialized = false;
let initPromise: Promise<boolean> | null = null;
let pendingPurchase: PendingPurchase | null = null;

function getCdvPurchase(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).CdvPurchase || null;
}

export function isAppleAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  const isIos = cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'ios';
  return Boolean(isIos && getCdvPurchase()?.store);
}

/**
 * Obtém o recibo da App Store (base64) no formato do cordova-plugin-purchase v13:
 * transaction.parentReceipt.nativeData.appStoreReceipt, com fallbacks para o recibo local.
 */
function getAppleReceiptData(transaction?: any): string | null {
  const fromTransaction = transaction?.parentReceipt?.nativeData?.appStoreReceipt;
  if (fromTransaction) return fromTransaction;

  const CdvPurchase = getCdvPurchase();
  const store = CdvPurchase?.store;
  if (!store) return null;

  const applePlatform = CdvPurchase.Platform?.APPLE_APPSTORE;
  const localReceipts: any[] = Array.isArray(store.localReceipts) ? store.localReceipts : [];
  const appleReceipt = localReceipts.find((receipt) => receipt?.platform === applePlatform);
  if (appleReceipt?.nativeData?.appStoreReceipt) return appleReceipt.nativeData.appStoreReceipt;

  // Compatibilidade com versões antigas do plugin
  return transaction?.appStoreReceipt || store.appStoreReceipt || null;
}

/** Tenta forçar a atualização do recibo local junto à Apple (pode pedir login da Apple ID). */
async function refreshAppleReceipt(): Promise<void> {
  const CdvPurchase = getCdvPurchase();
  const adapter = CdvPurchase?.store?.getAdapter?.(CdvPurchase.Platform?.APPLE_APPSTORE);
  if (typeof adapter?.refreshReceipt === 'function') {
    try {
      await adapter.refreshReceipt();
    } catch (err) {
      console.warn('[AppleBilling] Falha ao atualizar recibo da App Store:', err);
    }
  }
}

function settlePendingPurchase(productId: string | undefined, result: ApplePurchaseResult) {
  if (!pendingPurchase) return;
  if (productId && pendingPurchase.productId !== productId) return;
  clearTimeout(pendingPurchase.timeout);
  const { resolve } = pendingPurchase;
  pendingPurchase = null;
  resolve(result);
}

/** Erros em que não adianta reprocessar a transação (recibo inválido, compra de outra conta etc.) */
function isDefinitiveRejection(err: any): boolean {
  return err?.status === 400 || err?.status === 409;
}

async function handleApprovedTransaction(transaction: any) {
  const productId: string | undefined = transaction?.products?.[0]?.id || transaction?.productId;
  console.log('[AppleBilling] Transação aprovada na Apple App Store:', productId, transaction?.transactionId);

  const receiptData = getAppleReceiptData(transaction);
  if (!receiptData) {
    // Não finaliza: a transação volta a ser entregue no próximo início do app
    console.error('[AppleBilling] Recibo da App Store não encontrado para a transação aprovada.');
    settlePendingPurchase(productId, {
      success: false,
      pending: true,
      error: 'Pagamento aprovado, mas o recibo da App Store ainda não está disponível. Use "Restaurar compras" em instantes.',
    });
    return;
  }

  try {
    const res = await api.subscriptions.verifyApple({
      receiptData,
      productId,
      transactionId: transaction?.transactionId || transaction?.id,
    });
    await transaction.finish();
    console.log('[AppleBilling] Assinatura validada e ativada no backend com sucesso!');
    settlePendingPurchase(productId, { success: true, status: res.status });
  } catch (err: any) {
    console.error('[AppleBilling] Erro ao validar recibo Apple no backend:', err);

    if (isDefinitiveRejection(err)) {
      await Promise.resolve(transaction.finish()).catch(() => {});
      settlePendingPurchase(productId, {
        success: false,
        error: err?.message || 'A Apple recusou a validação desta compra.',
      });
      return;
    }

    // Falha temporária (rede, servidor): mantém a transação aberta para nova tentativa
    settlePendingPurchase(productId, {
      success: false,
      pending: true,
      error: 'Pagamento aprovado pela Apple, mas não conseguimos confirmar com nosso servidor. ' +
        'Tente "Restaurar compras" em alguns minutos.',
    });
  }
}

/**
 * Inicializa a loja da Apple App Store (In-App Purchases / Apple StoreKit) no app iOS
 */
export function initAppleBilling(): Promise<boolean> {
  const CdvPurchase = getCdvPurchase();
  if (!CdvPurchase?.store) return Promise.resolve(false);
  if (initialized) return Promise.resolve(true);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const store = CdvPurchase.store;
      const Platform = CdvPurchase.Platform;
      const ProductType = CdvPurchase.ProductType;

      // Registra os produtos de assinatura para a Apple App Store
      store.register(
        Object.values(APPLE_PRODUCT_IDS).map((id) => ({
          id,
          type: ProductType.PAID_SUBSCRIPTION,
          platform: Platform.APPLE_APPSTORE,
        })),
      );

      // Escuta quando uma compra é aprovada pela Apple (inclusive transações pendentes de sessões anteriores)
      store.when().approved((transaction: any) => {
        void handleApprovedTransaction(transaction);
      });

      await store.initialize([Platform.APPLE_APPSTORE]);
      initialized = true;
      console.log('[AppleBilling] Apple App Store inicializada com sucesso.');
      return true;
    } catch (error) {
      console.error('[AppleBilling] Falha ao inicializar Apple StoreKit:', error);
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Inicia o fluxo nativo de compra / assinatura na Apple App Store (FaceID / TouchID / Apple Pay).
 * Só resolve com success=true depois que o backend validou o recibo e ativou o plano.
 */
export async function purchaseSubscriptionOnApple(planSlugOrId: string): Promise<ApplePurchaseResult> {
  const CdvPurchase = getCdvPurchase();
  if (!CdvPurchase?.store) {
    return { success: false, error: 'Apple In-App Purchase não está disponível neste dispositivo.' };
  }

  if (!initialized) {
    const ok = await initAppleBilling();
    if (!ok) {
      return { success: false, error: 'Não foi possível conectar aos serviços da App Store.' };
    }
  }

  if (pendingPurchase) {
    return { success: false, error: 'Já existe uma compra em andamento. Aguarde a conclusão.' };
  }

  const store = CdvPurchase.store;
  const productId = PLAN_SLUG_TO_APPLE_PRODUCT_ID[planSlugOrId] || planSlugOrId;
  const product = store.get(productId, CdvPurchase.Platform.APPLE_APPSTORE);

  if (!product) {
    return {
      success: false,
      error: `Produto "${productId}" não encontrado na App Store. Verifique a configuração no App Store Connect.`,
    };
  }

  const offer = product.getOffer();
  if (!offer) {
    return {
      success: false,
      error: 'Nenhuma oferta de assinatura ativa encontrada para este plano.',
    };
  }

  return new Promise<ApplePurchaseResult>((resolve) => {
    pendingPurchase = {
      productId,
      resolve,
      timeout: setTimeout(() => {
        settlePendingPurchase(productId, {
          success: false,
          pending: true,
          error: 'A App Store ainda está processando sua compra. A assinatura será ativada assim que for confirmada.',
        });
      }, PURCHASE_TIMEOUT_MS),
    };

    // O resultado final (sucesso) vem pelo evento "approved" + validação no backend.
    Promise.resolve(store.order(offer))
      .then((error: any) => {
        if (!error) return;
        const cancelled = error.code === CdvPurchase.ErrorCode?.PAYMENT_CANCELLED;
        settlePendingPurchase(productId, {
          success: false,
          error: cancelled ? 'Compra cancelada.' : error.message || 'Compra recusada na App Store.',
        });
      })
      .catch((err: any) => {
        settlePendingPurchase(productId, {
          success: false,
          error: err?.message || 'Erro ao processar assinatura na Apple.',
        });
      });
  });
}

/**
 * Restaura compras anteriores na conta Apple (Exigência Apple Review)
 */
export async function restorePurchasesOnApple(): Promise<{ success: boolean; restored: boolean; message: string }> {
  const CdvPurchase = getCdvPurchase();
  if (!CdvPurchase?.store) {
    return { success: false, restored: false, message: 'App Store não disponível.' };
  }

  if (!initialized) {
    const ok = await initAppleBilling();
    if (!ok) return { success: false, restored: false, message: 'Não foi possível conectar aos serviços da App Store.' };
  }

  const store = CdvPurchase.store;

  try {
    const restoreError = await store.restorePurchases();
    if (restoreError?.message) {
      console.warn('[AppleBilling] restorePurchases retornou erro:', restoreError);
    }

    let receiptData = getAppleReceiptData();
    if (!receiptData) {
      await refreshAppleReceipt();
      receiptData = getAppleReceiptData();
    }

    if (!receiptData) {
      return { success: true, restored: false, message: 'Nenhuma compra da App Store encontrada nesta Apple ID.' };
    }

    const res = await api.subscriptions.restoreApple({ receiptData });
    if (res.restored) {
      return { success: true, restored: true, message: 'Assinatura restaurada com sucesso!' };
    }
    return { success: true, restored: false, message: res.message || 'Nenhuma assinatura ativa encontrada para restaurar.' };
  } catch (err: any) {
    return { success: false, restored: false, message: err?.message || 'Erro ao restaurar compras.' };
  }
}
