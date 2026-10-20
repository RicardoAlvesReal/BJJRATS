import api from '@/lib/api';

export const GOOGLE_PLAY_PRODUCT_IDS = {
  ALUNO: 'plano_aluno_mensal',
  PROFESSOR: 'plano_professor_mensal',
  ACADEMIA: 'plano_academia_mensal',
} as const;

export const PLAN_SLUG_TO_PRODUCT_ID: Record<string, string> = {
  aluno: GOOGLE_PLAY_PRODUCT_IDS.ALUNO,
  professor: GOOGLE_PLAY_PRODUCT_IDS.PROFESSOR,
  academia: GOOGLE_PLAY_PRODUCT_IDS.ACADEMIA,
};

let initialized = false;
let initializing = false;

function getCdvPurchase(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).CdvPurchase || null;
}

export function isGooglePlayAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  const isAndroid = cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'android';
  return Boolean(isAndroid && getCdvPurchase()?.store);
}

/**
 * Inicializa a loja do Google Play Billing no aplicativo Android
 */
export async function initGooglePlayBilling(): Promise<boolean> {
  const CdvPurchase = getCdvPurchase();
  if (!CdvPurchase?.store) return false;
  if (initialized) return true;
  if (initializing) return false;

  initializing = true;

  try {
    const store = CdvPurchase.store;
    const Platform = CdvPurchase.Platform;
    const ProductType = CdvPurchase.ProductType;

    // Registra os 3 produtos de assinatura cadastrados no Google Play Console
    store.register([
      {
        id: GOOGLE_PLAY_PRODUCT_IDS.ALUNO,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.GOOGLE_PLAY,
      },
      {
        id: GOOGLE_PLAY_PRODUCT_IDS.PROFESSOR,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.GOOGLE_PLAY,
      },
      {
        id: GOOGLE_PLAY_PRODUCT_IDS.ACADEMIA,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.GOOGLE_PLAY,
      },
    ]);

    // Escuta quando uma compra é aprovada na Play Store
    store.when().approved(async (transaction: any) => {
      console.log('[GooglePlayBilling] Transação aprovada na Play Store:', transaction);
      try {
        const token = transaction.purchaseToken || transaction.purchaseId;
        const productId = transaction.products?.[0]?.id || transaction.productId;

        if (token && productId) {
          // Envia recibo para o backend validar e ativar o plano
          await api.subscriptions.verifyGooglePlay({
            purchaseToken: token,
            productId,
          });
          console.log('[GooglePlayBilling] Assinatura validada e ativada no backend com sucesso!');
        }

        // Finaliza a transação para o Google Play saber que foi entregue
        await transaction.finish();
      } catch (err) {
        console.error('[GooglePlayBilling] Erro ao validar transação no backend:', err);
      }
    });

    await store.initialize([Platform.GOOGLE_PLAY]);
    initialized = true;
    console.log('[GooglePlayBilling] Google Play Store inicializada com sucesso.');
    return true;
  } catch (error) {
    console.error('[GooglePlayBilling] Falha ao inicializar Google Play Store:', error);
    return false;
  } finally {
    initializing = false;
  }
}

/**
 * Inicia o fluxo nativo de assinatura no Google Play
 */
export async function purchaseSubscriptionOnGooglePlay(planSlugOrId: string): Promise<{ success: boolean; error?: string }> {
  const CdvPurchase = getCdvPurchase();
  if (!CdvPurchase?.store) {
    return { success: false, error: 'Google Play Billing não está disponível neste dispositivo.' };
  }

  // Garante que a loja foi inicializada
  if (!initialized) {
    const ok = await initGooglePlayBilling();
    if (!ok) {
      return { success: false, error: 'Não foi possível conectar aos serviços da Google Play.' };
    }
  }

  const store = CdvPurchase.store;
  const productId = PLAN_SLUG_TO_PRODUCT_ID[planSlugOrId] || planSlugOrId;
  const product = store.get(productId, CdvPurchase.Platform.GOOGLE_PLAY);

  if (!product) {
    return {
      success: false,
      error: `Produto ${productId} não foi carregado pela Google Play. Verifique se o produto está ativo na Play Console.`,
    };
  }

  // Obtém a oferta padrão do produto
  const offer = product.getOffer();
  if (!offer) {
    return {
      success: false,
      error: `Nenhuma oferta ativa encontrada para o plano na Google Play.`,
    };
  }

  return new Promise((resolve) => {
    let resolved = false;

    // Timeout de segurança caso o usuário feche a tela sem disparar eventos
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: 'Tempo limite na comunicação com a Play Store.' });
      }
    }, 120000);

    const onApproved = async (transaction: any) => {
      const transProductId = transaction.products?.[0]?.id || transaction.productId;
      if (transProductId === productId) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ success: true });
        }
      }
    };

    const onCancelled = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ success: false, error: 'Compra cancelada pelo usuário.' });
      }
    };

    store.when().approved(onApproved);
    store.when().receiptsReady(() => {
      // Recibos prontos
    });

    store.order(offer).then((result: any) => {
      if (result && result.isError) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ success: false, error: result.message || 'Erro ao processar pedido.' });
        }
      }
    }).catch((err: any) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ success: false, error: err?.message || 'Erro ao abrir Google Play Store.' });
      }
    });
  });
}
