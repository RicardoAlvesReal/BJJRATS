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

let initialized = false;
let initializing = false;

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
 * Inicializa a loja da Apple App Store (In-App Purchases / Apple StoreKit) no app iOS
 */
export async function initAppleBilling(): Promise<boolean> {
  const CdvPurchase = getCdvPurchase();
  if (!CdvPurchase?.store) return false;
  if (initialized) return true;
  if (initializing) return false;

  initializing = true;

  try {
    const store = CdvPurchase.store;
    const Platform = CdvPurchase.Platform;
    const ProductType = CdvPurchase.ProductType;

    // Registra os produtos de assinatura para a Apple App Store
    store.register([
      {
        id: APPLE_PRODUCT_IDS.ALUNO,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      },
      {
        id: APPLE_PRODUCT_IDS.PROFESSOR,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      },
      {
        id: APPLE_PRODUCT_IDS.ACADEMIA,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      },
    ]);

    // Escuta quando uma compra é aprovada pela Apple
    store.when().approved(async (transaction: any) => {
      console.log('[AppleBilling] Transação aprovada na Apple App Store:', transaction);
      try {
        const receipt = transaction.appStoreReceipt || store.appStoreReceipt || transaction.purchaseToken;
        const productId = transaction.products?.[0]?.id || transaction.productId;

        if (receipt) {
          await api.subscriptions.verifyApple({
            receiptData: receipt,
            productId,
            transactionId: transaction.transactionId || transaction.id,
          });
          console.log('[AppleBilling] Assinatura validada e ativada no backend com sucesso!');
        }

        await transaction.finish();
      } catch (err) {
        console.error('[AppleBilling] Erro ao validar recibo Apple no backend:', err);
      }
    });

    await store.initialize([Platform.APPLE_APPSTORE]);
    initialized = true;
    console.log('[AppleBilling] Apple App Store inicializada com sucesso.');
    return true;
  } catch (error) {
    console.error('[AppleBilling] Falha ao inicializar Apple StoreKit:', error);
    return false;
  } finally {
    initializing = false;
  }
}

/**
 * Inicia o fluxo nativo de compra / assinatura na Apple App Store (FaceID / TouchID / Apple Pay)
 */
export async function purchaseSubscriptionOnApple(
  planSlugOrId: string
): Promise<{ success: boolean; error?: string }> {
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

  return new Promise((resolve) => {
    let finished = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        resolve({
          success: false,
          error: 'Tempo esgotado aguardando resposta da App Store.',
        });
      }
    }, 90000);

    store
      .order(offer)
      .then((result: any) => {
        if (result?.isError) {
          clearTimeout(timeout);
          finished = true;
          resolve({
            success: false,
            error: result.message || 'Compra cancelada ou recusada na App Store.',
          });
        } else {
          clearTimeout(timeout);
          finished = true;
          resolve({ success: true });
        }
      })
      .catch((err: any) => {
        clearTimeout(timeout);
        finished = true;
        const msg = err?.message || 'Erro ao processar assinatura na Apple.';
        resolve({ success: false, error: msg });
      });
  });
}

/**
 * Restaura compras anteriores na conta Apple (Exigência Apple Review)
 */
export async function restorePurchasesOnApple(): Promise<{ success: boolean; message: string }> {
  const CdvPurchase = getCdvPurchase();
  if (!CdvPurchase?.store) {
    return { success: false, message: 'App Store não disponível.' };
  }

  if (!initialized) {
    await initAppleBilling();
  }

  const store = CdvPurchase.store;

  try {
    await store.restorePurchases();
    const receipt = store.appStoreReceipt;

    if (receipt) {
      const res = await api.subscriptions.restoreApple({ receiptData: receipt });
      if (res.restored) {
        return { success: true, message: 'Assinatura restaurada com sucesso!' };
      }
    }

    return { success: true, message: 'Verificação concluída. Nenhuma compra pendente para restaurar.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao restaurar compras.' };
  }
}
