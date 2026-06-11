import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { whatsappInstances } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import * as evolution from '../services/evolutionApi.js';

const router = Router();

function getExpectedInstanceName(userId: string): string {
  return `bjjrats_${userId}`;
}

function uniqueInstanceNames(...names: Array<string | null | undefined>): string[] {
  return Array.from(new Set(names.filter((name): name is string => Boolean(name))));
}

router.get('/status', requireAuth, async (req: AuthRequest, res) => {
  const [instance] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

  const expectedInstanceName = getExpectedInstanceName(req.userId!);

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
        });
        return;
      }
    } catch {
      // Instance does not exist or is not connected.
    }
    res.json({ connected: false, instance: null });
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
    });
  } catch {
    res.json({
      connected: false,
      instance: {
        id: instance.id,
        status: 'disconnected',
        phone: instance.phone,
      },
    });
  }
});

router.post('/connect', requireAuth, async (req: AuthRequest, res) => {
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
    const result = await evolution.createInstance(req.userId!);
    const id = nanoid();
    await db.insert(whatsappInstances).values({
      id,
      professorUid: req.userId!,
      instanceName: result.instance.instanceName,
      status: 'connecting',
    });

    let payload = await evolution.toConnectionPayload(result);

    if (!payload.qrcode && !payload.pairingCode) {
      const qr = await evolution.connectInstance(req.userId!);
      payload = await evolution.toConnectionPayload(qr);
    }

    if (!payload.qrcode && !payload.pairingCode) {
      throw new Error('Evolution API nao retornou QR Code ou codigo de pareamento');
    }

    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao conectar';
    res.status(500).json({ error: message });
  }
});

router.post('/pairing-code', requireAuth, async (req: AuthRequest, res) => {
  const formattedPhone = String(req.body?.phone || '').replace(/\D/g, '');
  if (formattedPhone.length < 10) {
    res.status(400).json({ error: 'Informe um WhatsApp com DDD' });
    return;
  }

  try {
    const [existing] = await db.select().from(whatsappInstances)
      .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

    const expectedInstanceName = getExpectedInstanceName(req.userId!);
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

    const payload = await evolution.getPairingConnectionPayload(req.userId!, formattedPhone);
    if (!payload.pairingCode) {
      throw new Error('Evolution API nao retornou codigo de pareamento para este numero');
    }

    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar codigo';
    res.status(500).json({ error: message });
  }
});

router.post('/connection-code', requireAuth, async (req: AuthRequest, res) => {
  const [instance] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

  if (!instance) {
    res.status(400).json({ error: 'Instancia do WhatsApp nao iniciada' });
    return;
  }

  try {
    const payload = await evolution.getCurrentConnectionPayload(req.userId!, req.body?.phone);
    if (!payload.qrcode && !payload.pairingCode) {
      throw new Error('Evolution API nao retornou QR Code ou codigo de pareamento');
    }
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar codigo de conexao';
    res.status(500).json({ error: message });
  }
});

router.post('/disconnect', requireAuth, async (req: AuthRequest, res) => {
  const [instance] = await db.select().from(whatsappInstances)
    .where(eq(whatsappInstances.professorUid, req.userId!)).limit(1);

  const expectedInstanceName = getExpectedInstanceName(req.userId!);
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
