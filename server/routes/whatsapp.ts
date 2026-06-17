import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { whatsappInstances } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { isInternalAcademyProfessor } from '../services/academyProfessorAccess.js';
import * as evolution from '../services/evolutionApi.js';

const router = Router();
const CONNECTION_ATTEMPT_TIMEOUT_MS = 10 * 60 * 1000;

type WhatsAppInstanceRow = typeof whatsappInstances.$inferSelect;

async function blockInternalProfessorWhatsAppAccess(req: AuthRequest, res: any) {
  if (!await isInternalAcademyProfessor(req.userId!, req.userRole)) return false;
  res.status(403).json({ error: 'WhatsApp gerenciado pela academia.' });
  return true;
}

function getExpectedInstanceName(userId: string, role?: string | null): string {
  if (role === 'superadmin') return `bjjrats_superadmin`;
  return role === 'academy' || role === 'admin' ? `bjjrats_academy_${userId}` : `bjjrats_${userId}`;
}

function uniqueInstanceNames(...names: Array<string | null | undefined>): string[] {
  return Array.from(new Set(names.filter((name): name is string => Boolean(name))));
}

async function isConnectionAttemptExpired(instance: WhatsAppInstanceRow): Promise<boolean> {
  if (instance.status !== 'connecting') return false;

  const timeoutSeconds = Math.ceil(CONNECTION_ATTEMPT_TIMEOUT_MS / 1000);
  const [row] = await db.select({
    expired: sql<boolean>`
      coalesce(${whatsappInstances.updatedAt}, ${whatsappInstances.createdAt})
        <= localtimestamp - (${timeoutSeconds} * interval '1 second')
    `,
  })
    .from(whatsappInstances)
    .where(eq(whatsappInstances.id, instance.id))
    .limit(1);

  return Boolean(row?.expired);
}

async function deleteStoredInstance(instance: WhatsAppInstanceRow, expectedInstanceName?: string): Promise<void> {
  const [current] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.id, instance.id))
    .limit(1);

  if (!current || current.instanceName !== instance.instanceName) {
    return;
  }

  const instanceNames = uniqueInstanceNames(instance.instanceName, expectedInstanceName);
  for (const instanceName of instanceNames) {
    await evolution.ensureInstanceDeletedByName(instanceName);
  }
  await db.delete(whatsappInstances).where(eq(whatsappInstances.id, instance.id));
}

async function expireInstanceIfStale(instance: WhatsAppInstanceRow, expectedInstanceName?: string): Promise<boolean> {
  if (!await isConnectionAttemptExpired(instance)) return false;

  try {
    const state = await evolution.getConnectionState(instance.instanceName);
    if (state.instance.state === 'open') {
      const phone = state.instance.ownerJid?.split('@')[0] || instance.phone;
      await db.update(whatsappInstances)
        .set({ status: 'connected', phone })
        .where(eq(whatsappInstances.id, instance.id));
      return false;
    }
  } catch {
    // If the state lookup fails because the instance vanished, the cleanup below
    // removes the stale row as well.
  }

  await deleteStoredInstance(instance, expectedInstanceName);
  return true;
}

router.get('/status', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorWhatsAppAccess(req, res)) return;

  const [instance] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

  const expectedInstanceName = getExpectedInstanceName(req.userId!, req.userRole);

  if (!instance) {
    try {
      const state = await evolution.getConnectionState(expectedInstanceName);
      if (state.instance.state === 'open') {
        const id = nanoid();
        const phone = state.instance.ownerJid?.split('@')[0] || null;
        await db.insert(whatsappInstances).values({
          id,
          professorUid: req.userId!,
          instanceName: expectedInstanceName,
          status: 'connected',
          phone,
        });
        res.json({
          connected: true,
          instance: { id, status: 'connected', phone },
          expired: false,
          attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS,
        });
        return;
      }
    } catch {
      // Instance does not exist or is not connected.
    }
    res.json({ connected: false, instance: null, expired: false, attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS });
    return;
  }

  try {
    const state = await evolution.getConnectionState(instance.instanceName);
    const isConnected = state.instance.state === 'open';
    const phone = state.instance.ownerJid?.split('@')[0] || instance.phone;

    if (isConnected && instance.status !== 'connected') {
      await db.update(whatsappInstances)
        .set({ status: 'connected', phone })
        .where(eq(whatsappInstances.id, instance.id));
    } else if (!isConnected && await expireInstanceIfStale(instance, expectedInstanceName)) {
      res.json({
        connected: false,
        instance: null,
        expired: true,
        attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS,
      });
      return;
    } else if (!isConnected && instance.status === 'connected') {
      await db.update(whatsappInstances)
        .set({ status: 'disconnected' })
        .where(eq(whatsappInstances.id, instance.id));
    }

    res.json({
      connected: isConnected,
      instance: {
        id: instance.id,
        status: isConnected ? 'connected' : 'disconnected',
        phone,
      },
      expired: false,
      attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS,
    });
  } catch {
    if (await expireInstanceIfStale(instance, expectedInstanceName)) {
      res.json({
        connected: false,
        instance: null,
        expired: true,
        attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS,
      });
      return;
    }

    res.json({
      connected: false,
      instance: {
        id: instance.id,
        status: 'disconnected',
        phone: instance.phone,
      },
      expired: false,
      attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS,
    });
  }
});

router.post('/connect', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorWhatsAppAccess(req, res)) return;

  const [existing] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

  if (existing) {
    try {
      await evolution.ensureInstanceDeletedByName(existing.instanceName);
    } catch {
      // The create call below will return a clear Evolution error if it still exists.
    }
    await db.delete(whatsappInstances).where(eq(whatsappInstances.id, existing.id));
  }

  try {
    const result = await evolution.createInstance(req.userId!, {}, req.userRole);
    const id = nanoid();
    await db.insert(whatsappInstances).values({
      id,
      professorUid: req.userId!,
      instanceName: result.instance.instanceName,
      status: 'connecting',
    });

    let payload = await evolution.toConnectionPayload(result);

    if (!payload.qrcode) {
      // Pequena pausa para a instância inicializar na Evolution
      await new Promise(r => setTimeout(r, 1500));
      const qr = await evolution.connectInstance(req.userId!, req.userRole);
      payload = await evolution.toConnectionPayload(qr);
    }

    if (!payload.qrcode) {
      throw new Error('Evolution API nao retornou QR Code');
    }

    res.json({
      qrcode: payload.qrcode,
      qrCodeText: payload.qrCodeText,
      attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao conectar';
    console.error('[whatsapp] connect error:', message);
    res.status(500).json({ error: message });
  }
});

router.post('/pairing-code', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorWhatsAppAccess(req, res)) return;

  const countryCode = String(req.body?.countryCode || '55');
  const formattedPhone = evolution.formatPairingPhone(String(req.body?.phone || ''), countryCode);
  if (formattedPhone.length < 10) {
    res.status(400).json({ error: 'Informe um WhatsApp com DDD' });
    return;
  }

  try {
    const [existing] = await db.select().from(whatsappInstances)
      .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

    const expectedInstanceName = getExpectedInstanceName(req.userId!, req.userRole);
    const instanceNames = uniqueInstanceNames(existing?.instanceName, expectedInstanceName);

    for (const instanceName of instanceNames) {
      await evolution.ensureInstanceDeletedByName(instanceName);
    }

    if (existing) {
      await db.delete(whatsappInstances).where(eq(whatsappInstances.id, existing.id));
    }

    const result = await evolution.createInstance(req.userId!, { qrcode: false });
    const id = nanoid();
    await db.insert(whatsappInstances).values({
      id,
      professorUid: req.userId!,
      instanceName: result.instance.instanceName,
      status: 'connecting',
    });

    const payload = await evolution.getPairingConnectionPayload(req.userId!, formattedPhone, countryCode, req.userRole);
    if (!payload.pairingCode) {
      throw new Error('Evolution API nao retornou codigo de pareamento para este numero');
    }

    res.json({ ...payload, attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar codigo';
    res.status(500).json({ error: message });
  }
});

router.post('/connection-code', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorWhatsAppAccess(req, res)) return;

  const [instance] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

  if (!instance) {
    res.status(400).json({ error: 'Instancia do WhatsApp nao iniciada', attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS });
    return;
  }

  try {
    if (await expireInstanceIfStale(instance, getExpectedInstanceName(req.userId!, req.userRole))) {
      res.status(410).json({
        error: 'Tentativa de conexao expirada. Inicie uma nova tentativa.',
        expired: true,
        attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS,
      });
      return;
    }

    const payload = await evolution.getCurrentConnectionPayload(req.userId!, req.body?.phone, req.body?.countryCode, req.userRole);
    if (!payload.qrcode && !payload.pairingCode) {
      throw new Error('Evolution API nao retornou QR Code ou codigo de pareamento');
    }
    res.json({ ...payload, attemptTimeoutMs: CONNECTION_ATTEMPT_TIMEOUT_MS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar codigo de conexao';
    res.status(500).json({ error: message });
  }
});

router.post('/disconnect', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorWhatsAppAccess(req, res)) return;

  const [instance] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

  const expectedInstanceName = getExpectedInstanceName(req.userId!, req.userRole);
  const instanceNames = uniqueInstanceNames(instance?.instanceName, expectedInstanceName);

  const deleteErrors: string[] = [];
  for (const instanceName of instanceNames) {
    try {
      await evolution.ensureInstanceDeletedByName(instanceName);
    } catch (err) {
      deleteErrors.push(err instanceof Error ? err.message : `Erro ao deletar ${instanceName}`);
    }
  }

  if (deleteErrors.length) {
    res.status(502).json({
      error: 'Nao foi possivel deletar a instancia na Evolution API',
      details: deleteErrors,
    });
    return;
  }

  await db.delete(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, req.userId!));

  res.json({ success: true });
});

router.post('/send', requireAuth, async (req: AuthRequest, res) => {
  if (await blockInternalProfessorWhatsAppAccess(req, res)) return;

  const { phone, message } = req.body;

  if (!phone || !message) {
    res.status(400).json({ error: 'phone e message sao obrigatorios' });
    return;
  }

  const [instance] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

  if (!instance) {
    res.status(400).json({ error: 'WhatsApp nao conectado' });
    return;
  }

  try {
    const result = await evolution.sendMessage(req.userId!, phone, message);
    res.json({ success: true, messageId: result.key.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao enviar mensagem';
    res.status(500).json({ error: message });
  }
});

export default router;
