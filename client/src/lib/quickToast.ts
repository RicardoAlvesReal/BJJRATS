import { toast } from 'sonner';

/**
 * Aviso curto que sempre se fecha sozinho.
 * O sonner pausa o timer quando o cursor/dedo está sobre a área dos toasts ou quando a aba
 * perde o foco (download, folha de compartilhamento) — e às vezes não retoma. Por isso
 * fechamos manualmente também.
 */
export function quickToast(kind: 'success' | 'error', message: string, ms = 2500) {
  const id = toast[kind](message, { duration: ms });
  setTimeout(() => toast.dismiss(id), ms + 300);
  return id;
}
