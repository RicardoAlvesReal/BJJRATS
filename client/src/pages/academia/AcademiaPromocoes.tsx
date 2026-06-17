import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Award, Check, Edit3, RefreshCw, Save, Trash2, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import api, { type Promotion, type PromotionCriteria, type UserProfile } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { BELTS, BELT_COLORS } from '@/lib/bjjrats-constants';
import { FONTS } from '@/lib/design';
import { useAuth } from '@/contexts/AuthContext';

const ACCENT = '#E87722';
const BELTS_ORDER = [...BELTS];

const DEFAULT_CRITERIA: PromotionCriteria[] = [
  { belt: 'Branca', minTrainings: 50, minMonths: 6, notes: '' },
  { belt: 'Azul', minTrainings: 100, minMonths: 12, notes: '' },
  { belt: 'Roxa', minTrainings: 200, minMonths: 18, notes: '' },
  { belt: 'Marrom', minTrainings: 300, minMonths: 24, notes: '' },
  { belt: 'Preta', minTrainings: 500, minMonths: 36, notes: '' },
];

interface AcademyEnrollment {
  id: string;
  studentUid: string;
  studentName?: string | null;
  studentEmail?: string | null;
  studentPhone?: string | null;
  studentBelt?: string | null;
  studentStripes?: number | null;
  status?: string | null;
}

type AcademyStudent = UserProfile & {
  enrollmentId?: string;
  enrollmentStatus?: string | null;
};

interface ReadyAlert {
  student: AcademyStudent;
  nextBelt: string;
  trainings: number;
  monthsInBelt: number;
  criteria: PromotionCriteria;
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#0A0A0A',
  border: '1px solid #2A2A2A',
  color: '#FFF',
  fontFamily: 'Barlow, sans-serif',
  fontSize: '0.875rem',
  padding: '0.65rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

function normalizeCriteria(value: unknown): PromotionCriteria[] {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_CRITERIA;
  return value
    .filter(item => item && typeof item === 'object')
    .map((item: any) => ({
      belt: String(item.belt || 'Branca'),
      minTrainings: Math.max(0, Number(item.minTrainings) || 0),
      minMonths: Math.max(0, Number(item.minMonths) || 0),
      notes: String(item.notes || ''),
    }))
    .filter(item => BELTS_ORDER.includes(item.belt as any));
}

function formatDate(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

function monthsSince(value?: string | Date | null) {
  if (!value) return 999;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)));
}

function beltLabel(student: Partial<AcademyStudent>) {
  return `${student.belt || 'Branca'}${(student.stripes ?? 0) > 0 ? ` - ${student.stripes} grau` : ''}`;
}

function nextBeltFor(belt?: string) {
  const index = BELTS_ORDER.indexOf((belt || 'Branca') as any);
  if (index < 0 || index >= BELTS_ORDER.length - 1) return '';
  return BELTS_ORDER[index + 1];
}

export default function AcademiaPromocoes() {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState<AcademyStudent[]>([]);
  const [criteria, setCriteria] = useState<PromotionCriteria[]>(DEFAULT_CRITERIA);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [readyAlerts, setReadyAlerts] = useState<ReadyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [editingBelt, setEditingBelt] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PromotionCriteria>>({});
  const [promotionTarget, setPromotionTarget] = useState<AcademyStudent | null>(null);
  const [newBelt, setNewBelt] = useState('Branca');
  const [newStripes, setNewStripes] = useState(0);
  const [promotionNotes, setPromotionNotes] = useState('');
  const [promoting, setPromoting] = useState(false);

  const academyName = (profile as any)?.academyName || (profile as any)?.academy || user?.name || 'Academia';

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [userData, studentRows, enrollmentRows, promotionRows] = await Promise.all([
        api.users.get(user.uid),
        api.users.list({ role: 'student', academyId: user.uid }),
        api.enrollments.list({ professorUid: user.uid }) as Promise<AcademyEnrollment[]>,
        api.promotions.list({ professorUid: user.uid }),
      ]);

      const byUid = new Map<string, AcademyStudent>();
      for (const student of studentRows) {
        byUid.set(student.uid, { ...student });
      }

      for (const enrollment of enrollmentRows) {
        if (!enrollment.studentUid || enrollment.status === 'cancelled' || enrollment.status === 'rejected') continue;
        const current = byUid.get(enrollment.studentUid);
        byUid.set(enrollment.studentUid, {
          ...(current || {
            uid: enrollment.studentUid,
            name: enrollment.studentName || 'Aluno',
            email: enrollment.studentEmail || '',
            phone: enrollment.studentPhone || '',
            belt: enrollment.studentBelt || 'Branca',
            stripes: enrollment.studentStripes ?? 0,
          } as AcademyStudent),
          enrollmentId: enrollment.id,
          enrollmentStatus: enrollment.status,
          belt: current?.belt || enrollment.studentBelt || 'Branca',
          stripes: current?.stripes ?? enrollment.studentStripes ?? 0,
        });
      }

      setCriteria(normalizeCriteria((userData as any).promotionCriteria));
      setStudents(Array.from(byUid.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR')));
      setPromotions(promotionRows.sort((a, b) =>
        new Date(b.promotedAt || b.createdAt || 0).getTime() - new Date(a.promotedAt || a.createdAt || 0).getTime()
      ));
    } catch {
      toast.error('Erro ao carregar promocoes da academia.');
      setStudents([]);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!students.length || !criteria.length) {
      setReadyAlerts([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoadingAlerts(true);
      try {
        const alerts = await Promise.all(students.map(async student => {
          const nextBelt = nextBeltFor(student.belt);
          if (!nextBelt) return null;
          const rule = criteria.find(item => item.belt === (student.belt || 'Branca'));
          if (!rule) return null;

          const [trainingRows, studentPromotions] = await Promise.all([
            api.trainings.list(student.uid).catch(() => []),
            api.promotions.list({ studentUid: student.uid }).catch(() => []),
          ]);

          const trainings = Math.max(student.totalTrainings ?? 0, trainingRows.length);
          const sortedPromotions = [...studentPromotions].sort((a, b) =>
            new Date(b.promotedAt || b.createdAt || 0).getTime() - new Date(a.promotedAt || a.createdAt || 0).getTime()
          );
          const monthsInBelt = sortedPromotions.length > 0
            ? monthsSince(sortedPromotions[0].promotedAt || sortedPromotions[0].createdAt)
            : monthsSince(student.bjjSince);

          if (trainings >= rule.minTrainings && monthsInBelt >= rule.minMonths) {
            return { student, nextBelt, trainings, monthsInBelt, criteria: rule };
          }
          return null;
        }));

        if (!cancelled) setReadyAlerts(alerts.filter(Boolean) as ReadyAlert[]);
      } catch {
        if (!cancelled) setReadyAlerts([]);
      } finally {
        if (!cancelled) setLoadingAlerts(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [students, criteria]);

  const activeStudents = useMemo(
    () => students.filter(student => student.enrollmentStatus !== 'cancelled' && student.enrollmentStatus !== 'rejected'),
    [students],
  );

  const openPromotion = (student: AcademyStudent, suggestedBelt?: string) => {
    setPromotionTarget(student);
    setNewBelt(suggestedBelt || nextBeltFor(student.belt) || student.belt || 'Branca');
    setNewStripes(0);
    setPromotionNotes('');
  };

  const handleSaveCriteria = async () => {
    if (!user?.uid) return;
    setSavingCriteria(true);
    try {
      await api.users.update(user.uid, { promotionCriteria: criteria } as any);
      toast.success('Criterios salvos.');
      setEditingBelt(null);
    } catch {
      toast.error('Erro ao salvar criterios.');
    } finally {
      setSavingCriteria(false);
    }
  };

  const handleSaveEdit = () => {
    setCriteria(prev => prev.map(item => item.belt === editingBelt ? {
      ...item,
      minTrainings: Math.max(0, Number(editForm.minTrainings) || 0),
      minMonths: Math.max(0, Number(editForm.minMonths) || 0),
      notes: editForm.notes || '',
    } : item));
    setEditingBelt(null);
  };

  const handlePromote = async () => {
    if (!user?.uid || !promotionTarget) return;
    setPromoting(true);
    try {
      const row = await api.promotions.create({
        professorUid: user.uid,
        studentUid: promotionTarget.uid,
        studentName: promotionTarget.name,
        previousBelt: promotionTarget.belt || 'Branca',
        previousStripes: promotionTarget.stripes ?? 0,
        newBelt,
        newStripes,
        notes: promotionNotes.trim(),
        promotedBy: user.uid,
      });

      try {
        await api.notifications.create({
          toUid: promotionTarget.uid,
          type: 'promotion',
          title: 'Promocao registrada',
          message: `Parabens! ${academyName} promoveu voce para faixa ${newBelt}${newStripes > 0 ? ` - ${newStripes} grau` : ''}.`,
          data: { belt: newBelt, stripes: newStripes, promotionId: row.id },
          read: false,
        });
      } catch {
        // A promocao nao deve ser revertida se a notificacao falhar.
      }

      setStudents(prev => prev.map(student => student.uid === promotionTarget.uid ? { ...student, belt: newBelt, stripes: newStripes } : student));
      setPromotions(prev => [row, ...prev]);
      toast.success(`${promotionTarget.name} promovido.`);
      setPromotionTarget(null);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao promover aluno.');
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map(item => <div key={item} className="bjj-skeleton h-24 rounded-xl" />)}
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.5rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Promocao de Alunos
          </h1>
          <p style={{ color: '#666', fontSize: '0.85rem', fontFamily: FONTS.condensed, letterSpacing: '0.05em', marginTop: '0.125rem' }}>
            {academyName}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={load} className="bjj-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.45rem 0.75rem' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={handleSaveCriteria} disabled={savingCriteria} style={primaryButtonStyle(savingCriteria)}>
            <Save size={14} /> {savingCriteria ? 'Salvando...' : 'Salvar criterios'}
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Alunos avaliados" value={activeStudents.length} color="#FFF" icon={<UserCheck size={18} />} />
        <StatCard label="Prontos" value={readyAlerts.length} color="#22C55E" icon={<Check size={18} />} />
        <StatCard label="Promocoes" value={promotions.length} color={ACCENT} icon={<Award size={18} />} />
        <StatCard label="Criterios" value={criteria.length} color="#3B82F6" icon={<Edit3 size={18} />} />
      </motion.div>

      <motion.div variants={fadeUp} className="bjj-card" style={{ padding: '1.25rem', marginBottom: '1rem', borderLeft: `3px solid ${readyAlerts.length > 0 ? '#22C55E' : '#2A2A2A'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <p className="bjj-label" style={{ margin: 0 }}>Alunos prontos</p>
          {loadingAlerts && <span style={{ fontFamily: FONTS.condensed, color: '#666', fontSize: '0.72rem', textTransform: 'uppercase' }}>Calculando...</span>}
        </div>
        {!loadingAlerts && readyAlerts.length === 0 ? (
          <Empty text="Nenhum aluno atingiu os criterios ainda." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {readyAlerts.map(alert => (
              <StudentPromotionCard
                key={alert.student.uid}
                student={alert.student}
                color="#22C55E"
                right={`${alert.trainings} treinos`}
                hint={`${alert.monthsInBelt} meses na faixa - proxima: ${alert.nextBelt}`}
                actionLabel="Promover"
                onAction={() => openPromotion(alert.student, alert.nextBelt)}
              />
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">Criterios por faixa</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {criteria.map(item => (
              <CriteriaRow
                key={item.belt}
                item={item}
                editing={editingBelt === item.belt}
                editForm={editForm}
                onEdit={() => { setEditingBelt(item.belt); setEditForm({ ...item }); }}
                onCancel={() => setEditingBelt(null)}
                onSave={handleSaveEdit}
                onDelete={() => setCriteria(prev => prev.filter(row => row.belt !== item.belt))}
                onFormChange={setEditForm}
              />
            ))}
          </div>
          {criteria.length < BELTS_ORDER.length && (
            <button
              onClick={() => {
                const next = BELTS_ORDER.find(belt => !criteria.some(item => item.belt === belt));
                if (next) setCriteria(prev => [...prev, { belt: next, minTrainings: 100, minMonths: 12, notes: '' }]);
              }}
              style={{ marginTop: '0.75rem', width: '100%', background: 'transparent', border: `1px dashed ${ACCENT}66`, color: ACCENT, fontFamily: FONTS.condensed, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.75rem', cursor: 'pointer' }}
            >
              Adicionar faixa
            </button>
          )}
        </div>

        <div className="bjj-card" style={{ padding: '1.25rem' }}>
          <p className="bjj-label">Historico recente</p>
          {promotions.length === 0 ? (
            <Empty text="Nenhuma promocao registrada." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
              {promotions.slice(0, 10).map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid #1A1A1A' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', fontSize: '0.9rem', margin: 0, textTransform: 'uppercase' }}>{item.studentName || 'Aluno'}</p>
                    <p style={{ fontFamily: 'Barlow, sans-serif', color: '#666', fontSize: '0.72rem', margin: 0 }}>
                      {item.fromBelt || item.previousBelt || 'Faixa'} para {item.toBelt || item.newBelt || 'Faixa'}
                    </p>
                  </div>
                  <span style={{ fontFamily: FONTS.condensed, color: ACCENT, fontWeight: 900, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {item.promotedAtStr || formatDate(item.promotedAt || item.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="bjj-card" style={{ padding: '1.25rem' }}>
        <p className="bjj-label">Promocao manual</p>
        {activeStudents.length === 0 ? (
          <Empty text="Nenhum aluno vinculado." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
            {activeStudents.map(student => (
              <StudentPromotionCard
                key={student.uid}
                student={student}
                color={BELT_COLORS[student.belt || 'Branca'] || '#888'}
                right={beltLabel(student)}
                hint={`${student.totalTrainings ?? 0} treinos registrados`}
                actionLabel="Promover"
                onAction={() => openPromotion(student)}
              />
            ))}
          </div>
        )}
      </motion.div>

      {promotionTarget && (
        <PromotionModal
          student={promotionTarget}
          newBelt={newBelt}
          newStripes={newStripes}
          notes={promotionNotes}
          promoting={promoting}
          onBeltChange={(belt) => { setNewBelt(belt); setNewStripes(0); }}
          onStripesChange={setNewStripes}
          onNotesChange={setPromotionNotes}
          onClose={() => setPromotionTarget(null)}
          onConfirm={handlePromote}
        />
      )}
    </motion.div>
  );
}

function primaryButtonStyle(disabled?: boolean): CSSProperties {
  return {
    background: disabled ? '#333' : ACCENT,
    border: 'none',
    color: '#FFF',
    fontFamily: FONTS.condensed,
    fontWeight: 900,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '0.55rem 0.85rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  };
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: ReactNode }) {
  return (
    <div className="bjj-card" style={{ padding: '1rem', borderLeft: `3px solid ${color}`, minHeight: 98 }}>
      <div style={{ color, marginBottom: '0.45rem' }}>{icon}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1, fontFamily: FONTS.condensed }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem', fontFamily: FONTS.condensed }}>{label}</div>
    </div>
  );
}

function CriteriaRow({
  item,
  editing,
  editForm,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onFormChange,
}: {
  item: PromotionCriteria;
  editing: boolean;
  editForm: Partial<PromotionCriteria>;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  onFormChange: React.Dispatch<React.SetStateAction<Partial<PromotionCriteria>>>;
}) {
  const color = BELT_COLORS[item.belt] || '#888';

  if (editing) {
    return (
      <div style={{ background: '#111', border: '1px solid #2A2A2A', padding: '0.9rem', borderLeft: `3px solid ${color}` }}>
        <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>Faixa {item.belt}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Treinos minimos">
            <input type="number" min={0} value={editForm.minTrainings ?? ''} onChange={event => onFormChange(form => ({ ...form, minTrainings: Number(event.target.value) }))} style={inputStyle} />
          </Field>
          <Field label="Meses na faixa">
            <input type="number" min={0} value={editForm.minMonths ?? ''} onChange={event => onFormChange(form => ({ ...form, minMonths: Number(event.target.value) }))} style={inputStyle} />
          </Field>
        </div>
        <Field label="Observacoes">
          <input value={editForm.notes ?? ''} onChange={event => onFormChange(form => ({ ...form, notes: event.target.value }))} style={inputStyle} />
        </Field>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button onClick={onCancel} style={secondaryButtonStyle()}><X size={14} /> Cancelar</button>
          <button onClick={onSave} style={primaryButtonStyle()}><Check size={14} /> Confirmar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.9rem', borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, color: '#FFF', textTransform: 'uppercase', margin: 0 }}>Faixa {item.belt}</p>
          <p style={{ fontFamily: 'Barlow, sans-serif', color: '#666', fontSize: '0.75rem', margin: '0.15rem 0 0' }}>
            {item.minTrainings} treinos minimos - {item.minMonths} meses
            {item.notes ? ` - ${item.notes}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <IconButton title="Editar criterio" color="#3B82F6" onClick={onEdit}><Edit3 size={15} /></IconButton>
          <IconButton title="Remover criterio" color="#CC0000" onClick={onDelete}><Trash2 size={15} /></IconButton>
        </div>
      </div>
    </div>
  );
}

function StudentPromotionCard({ student, right, hint, color, actionLabel, onAction }: { student: AcademyStudent; right: string; hint: string; color: string; actionLabel: string; onAction: () => void }) {
  const beltColor = BELT_COLORS[student.belt || 'Branca'] || '#888';
  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', padding: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: `3px solid ${color}` }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', border: `2px solid ${beltColor}`, background: '#1A1A1A', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {student.photo ? <img src={student.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: FONTS.condensed, color: '#777', fontWeight: 900 }}>{(student.name || '?').charAt(0).toUpperCase()}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.95rem', color: '#FFF', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</p>
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.72rem', color: '#666', margin: 0 }}>{hint}</p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.82rem', color, margin: 0 }}>{right}</p>
        <button onClick={onAction} style={{ marginTop: '0.35rem', background: `${ACCENT}22`, border: `1px solid ${ACCENT}66`, color: ACCENT, fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.28rem 0.5rem', cursor: 'pointer' }}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function PromotionModal({
  student,
  newBelt,
  newStripes,
  notes,
  promoting,
  onBeltChange,
  onStripesChange,
  onNotesChange,
  onClose,
  onConfirm,
}: {
  student: AcademyStudent;
  newBelt: string;
  newStripes: number;
  notes: string;
  promoting: boolean;
  onBeltChange: (belt: string) => void;
  onStripesChange: (stripes: number) => void;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const unchanged = newBelt === (student.belt || 'Branca') && newStripes === (student.stripes ?? 0);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={event => event.stopPropagation()}
        style={{ width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#0D0D0D', border: '1px solid #2A2A2A', borderTop: `3px solid ${ACCENT}`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.95rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: FONTS.condensed, fontWeight: 900, fontSize: '1.15rem', color: '#FFF', textTransform: 'uppercase', margin: 0 }}>Promover aluno</p>
            <p style={{ fontFamily: 'Barlow, sans-serif', color: '#777', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>{student.name} - atual: {beltLabel(student)}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: 0 }}><X size={20} /></button>
        </div>

        <Field label="Nova faixa">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {BELTS_ORDER.map(belt => {
              const selected = newBelt === belt;
              const color = BELT_COLORS[belt] || '#888';
              return (
                <button
                  key={belt}
                  onClick={() => onBeltChange(belt)}
                  style={{ background: selected ? color : '#111', border: `1px solid ${selected ? color : '#2A2A2A'}`, color: selected && belt === 'Branca' ? '#000' : selected ? '#FFF' : '#888', fontFamily: FONTS.condensed, fontWeight: 900, textTransform: 'uppercase', padding: '0.45rem 0.7rem', cursor: 'pointer' }}
                >
                  {belt}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Graus">
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4].map(stripes => (
              <button
                key={stripes}
                onClick={() => onStripesChange(stripes)}
                style={{ width: 38, height: 38, background: newStripes === stripes ? ACCENT : '#111', border: `1px solid ${newStripes === stripes ? ACCENT : '#2A2A2A'}`, color: newStripes === stripes ? '#FFF' : '#777', fontFamily: FONTS.condensed, fontWeight: 900, cursor: 'pointer' }}
              >
                {stripes}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Observacoes">
          <textarea value={notes} onChange={event => onNotesChange(event.target.value)} rows={3} style={{ ...inputStyle, resize: 'none' }} />
        </Field>

        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={onClose} style={secondaryButtonStyle()}><X size={14} /> Cancelar</button>
          <button onClick={onConfirm} disabled={promoting || unchanged} style={primaryButtonStyle(promoting || unchanged)}><Award size={14} /> {promoting ? 'Salvando...' : 'Confirmar promocao'}</button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.75rem' }}>
      <span style={{ fontFamily: FONTS.condensed, fontWeight: 800, fontSize: '0.68rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      {children}
    </label>
  );
}

function secondaryButtonStyle(): CSSProperties {
  return {
    flex: 1,
    background: 'transparent',
    border: '1px solid #333',
    color: '#777',
    fontFamily: FONTS.condensed,
    fontWeight: 900,
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '0.65rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
  };
}

function IconButton({ title, color, onClick, children }: { title: string; color: string; onClick: () => void; children: ReactNode }) {
  return (
    <button title={title} onClick={onClick} style={{ width: 34, height: 34, background: `${color}14`, border: `1px solid ${color}66`, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ fontFamily: FONTS.condensed, color: '#555', fontSize: '0.85rem', textTransform: 'uppercase', margin: '0.75rem 0 0' }}>{text}</p>;
}
