import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { tabVariant, tabTransition } from '@/lib/animations';
import { toast } from 'sonner';

interface RequestItem {
  id: string;
  studentUid: string;
  studentName: string | null;
  studentEmail: string | null;
  studentPhoto: string | null;
  studentBelt: string | null;
  professorUid: string;
  professorName?: string;
  academyName: string | null;
  status: string | null;
  createdAt: string | null;
}

interface ProfessorInfo {
  uid: string;
  name: string;
}

export default function AdminRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [professors, setProfessors] = useState<ProfessorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profs = await api.users.list({ academyId: user.uid, role: 'professor' });
      setProfessors(profs.map((p: any) => ({ uid: p.uid, name: p.name })));

      const allReqs = await api.academyRequests.list({ professorUid: user.uid });
      const myRequests = allReqs as any as RequestItem[];
      const profUids = new Set(profs.map((p: any) => p.uid));
      const filtered = myRequests.filter(r => r.professorUid === user.uid || profUids.has(r.professorUid));
      const withProfNames = filtered.map(r => ({
        ...r,
        professorName: profs.find((p: any) => p.uid === r.professorUid)?.name || '',
      }));
      withProfNames.sort((a, b) => ((b.createdAt || '') > (a.createdAt || '') ? 1 : -1));
      setRequests(withProfNames);
    } catch (err) {
      console.error(err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (req: RequestItem, newStatus: 'accepted' | 'rejected') => {
    setProcessing(req.id);
    try {
      await api.academyRequests.update(req.id, { status: newStatus });
      setRequests(prev => prev.filter(r => r.id !== req.id));
      toast.success(newStatus === 'accepted'
        ? `${req.studentName} foi aprovado!`
        : `Solicitação de ${req.studentName} recusada.`);
    } catch {
      toast.error('Erro ao processar solicitação');
    } finally {
      setProcessing(null);
    }
  };

  const displayed = filter === 'pending' ? requests.filter(r => r.status === 'pending') : requests;

  return (
    <motion.div variants={tabVariant} initial="initial" animate="animate" exit="exit" transition={tabTransition}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-black text-lg tracking-[0.05em] uppercase">Solicitações</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className="text-[0.65rem] font-bold tracking-[0.1em] uppercase px-3 py-1.5 border-none cursor-pointer transition-colors"
            style={{ background: filter === 'pending' ? '#CC0000' : '#1A1A1A', color: '#FFF' }}
          >
            Pendentes {requests.filter(r => r.status === 'pending').length > 0 && `(${requests.filter(r => r.status === 'pending').length})`}
          </button>
          <button
            onClick={() => setFilter('all')}
            className="text-[0.65rem] font-bold tracking-[0.1em] uppercase px-3 py-1.5 border-none cursor-pointer transition-colors"
            style={{ background: filter === 'all' ? '#333' : '#1A1A1A', color: '#888' }}
          >
            Histórico
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-[#666] text-sm">Carregando solicitações...</p>
      )}

      {!loading && displayed.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#444] text-sm font-bold tracking-[0.05em] uppercase">
            {filter === 'pending' ? 'Nenhuma solicitação pendente' : 'Nenhuma solicitação no histórico'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {displayed.map(req => (
          <div
            key={req.id}
            className="p-4"
            style={{ background: '#111', border: `1px solid ${req.status === 'pending' ? '#CC000044' : '#222'}` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 flex items-center justify-center text-sm font-black shrink-0"
                style={{ background: '#1A0000', border: '1px solid #CC0000' }}
              >
                {req.studentPhoto ? (
                  <img src={req.studentPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#CC0000]">#{req.studentName?.[0] || '?'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm truncate">{req.studentName}</span>
                  {req.studentBelt && (
                    <span className="text-[0.6rem] font-bold uppercase tracking-[0.05em] px-1.5 py-0.5" style={{ background: '#222', color: '#888' }}>
                      {req.studentBelt}
                    </span>
                  )}
                  {req.professorName && (
                    <span className="text-[0.55rem] text-[#555]">
                      → Prof. {req.professorName}
                    </span>
                  )}
                </div>
                <p className="text-[#666] text-[0.7rem] mt-0.5">
                  {req.academyName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[0.55rem] text-[#444]">
                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString('pt-BR') : ''}
                  </span>
                  {req.status !== 'pending' && (
                    <span
                      className="text-[0.55rem] font-bold uppercase tracking-[0.05em] px-1.5 py-0.5"
                      style={{
                        background: req.status === 'accepted' ? '#0A2A1A' : '#2A1A1A',
                        color: req.status === 'accepted' ? '#22C55E' : '#CC0000',
                      }}
                    >
                      {req.status === 'accepted' ? 'Aprovado' : 'Recusado'}
                    </span>
                  )}
                </div>
              </div>

              {req.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(req, 'accepted')}
                    disabled={processing === req.id}
                    className="text-[0.6rem] font-bold tracking-[0.05em] uppercase px-3 py-1.5 border-none cursor-pointer"
                    style={{ background: '#22C55E', color: '#FFF', opacity: processing === req.id ? 0.5 : 1 }}
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleAction(req, 'rejected')}
                    disabled={processing === req.id}
                    className="text-[0.6rem] font-bold tracking-[0.05em] uppercase px-3 py-1.5 border-none cursor-pointer"
                    style={{ background: '#CC0000', color: '#FFF', opacity: processing === req.id ? 0.5 : 1 }}
                  >
                    Recusar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
