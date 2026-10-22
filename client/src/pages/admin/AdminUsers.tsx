import { useEffect, useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import api, { type AdminUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_HIERARCHY } from '@/lib/roleHierarchy';
import { RoleBadge } from './AdminDashboard';

interface ExportColumnDef {
  id: string;
  label: string;
  category: 'contato' | 'perfil' | 'financeiro' | 'sistema';
}

const EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: 'name', label: 'Nome Completo', category: 'contato' },
  { id: 'email', label: 'E-mail', category: 'contato' },
  { id: 'phone', label: 'Telefone / WhatsApp', category: 'contato' },
  { id: 'role', label: 'Perfil / Função', category: 'perfil' },
  { id: 'effectiveStatus', label: 'Status da Conta (Real)', category: 'financeiro' },
  { id: 'belt', label: 'Faixa', category: 'perfil' },
  { id: 'stripes', label: 'Graus', category: 'perfil' },
  { id: 'academy', label: 'Academia', category: 'perfil' },
  { id: 'academyCity', label: 'Cidade da Academia', category: 'perfil' },
  { id: 'academyState', label: 'Estado (UF)', category: 'perfil' },
  { id: 'subStatus', label: 'Status da Assinatura', category: 'financeiro' },
  { id: 'subPlan', label: 'Nome do Plano', category: 'financeiro' },
  { id: 'subPrice', label: 'Valor do Plano (R$)', category: 'financeiro' },
  { id: 'subPeriodEnd', label: 'Vencimento da Assinatura', category: 'financeiro' },
  { id: 'firstPaymentDate', label: 'Data do 1º Pagamento', category: 'financeiro' },
  { id: 'lastPaymentDate', label: 'Data do Último Pagamento', category: 'financeiro' },
  { id: 'totalPaid', label: 'Total Pago Acumulado (R$)', category: 'financeiro' },
  { id: 'paymentsCount', label: 'Qtd de Faturas Pagas', category: 'financeiro' },
  { id: 'createdAt', label: 'Data de Cadastro', category: 'sistema' },
  { id: 'accountDays', label: 'Dias de Conta', category: 'sistema' },
  { id: 'communityModerator', label: 'Moderador da Comunidade', category: 'sistema' },
];

const DEFAULT_SELECTED_COLS: Record<string, boolean> = {
  name: true,
  email: true,
  phone: true,
  role: true,
  effectiveStatus: true,
  subPlan: true,
  createdAt: true,
};

export function StatusBadge({ user }: { user: AdminUser }) {
  const eff = user.effectiveStatus || 'none';
  const daysDiff = user.trialDaysDiff;

  if (eff === 'active') {
    return (
      <span style={{
        background: '#153315', color: '#4CAF50', border: '1px solid #4CAF5044',
        padding: '2px 8px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '5px',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50' }} />
        Em dia
      </span>
    );
  }

  if (eff === 'trial') {
    return (
      <span style={{
        background: '#0F253E', color: '#3B82F6', border: '1px solid #3B82F644',
        padding: '2px 8px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '5px',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }} />
        Trial {daysDiff !== undefined && daysDiff >= 0 ? `(${daysDiff}d)` : ''}
      </span>
    );
  }

  if (eff === 'trial_expired') {
    return (
      <span style={{
        background: '#331F0A', color: '#E87722', border: '1px solid #E8772244',
        padding: '2px 8px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '5px',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E87722' }} />
        Trial Vencido {daysDiff !== undefined && daysDiff < 0 ? `(há ${Math.abs(daysDiff)}d)` : ''}
      </span>
    );
  }

  if (eff === 'past_due') {
    return (
      <span style={{
        background: '#330A0A', color: '#FF4D4D', border: '1px solid #FF4D4D44',
        padding: '2px 8px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '5px',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF4D4D' }} />
        Inadimplente
      </span>
    );
  }

  if (eff === 'suspended') {
    return (
      <span style={{
        background: '#1F1F1F', color: '#888', border: '1px solid #444',
        padding: '2px 8px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '5px',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#888' }} />
        Suspenso
      </span>
    );
  }

  return (
    <span style={{
      background: '#141414', color: '#666', border: '1px solid #222',
      padding: '2px 8px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      Sem plano
    </span>
  );
}


interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
  belt: string;
  phone: string;
  academy: string;
  academyName: string;
  academyAddress: string;
  academyCity: string;
  academyState: string;
  academyCnpj: string;
  academyCep: string;
  academyNumber: string;
  academyNeighborhood: string;
  academyComplement: string;
}

const EMPTY_FORM: UserForm = { name: '', email: '', password: '', role: 'student', belt: 'Branca', phone: '', academy: '', academyName: '', academyAddress: '', academyCity: '', academyState: '', academyCnpj: '', academyCep: '', academyNumber: '', academyNeighborhood: '', academyComplement: '' };

const BELTS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const myRole = me?.role ?? 'student';
  const myLevel = ROLE_HIERARCHY[myRole] ?? 1;

  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [form, setForm]             = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [confirmDel, setConfirmDel] = useState<AdminUser | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Estados do Modal de Exportação
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSource, setExportSource]       = useState<'all' | 'filtered'>('all');
  const [exportRole, setExportRole]           = useState<string>('all');
  const [exportSubStatus, setExportSubStatus] = useState<string>('all');
  const [exportBelt, setExportBelt]           = useState<string>('all');
  const [exportFormat, setExportFormat]       = useState<'xlsx' | 'csv'>('xlsx');
  const [selectedCols, setSelectedCols]       = useState<Record<string, boolean>>(DEFAULT_SELECTED_COLS);

  // Filtro de status da lista principal
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'trial_expired' | 'past_due' | 'suspended' | 'none'>('all');

  const fetchCities = useCallback(async (uf: string) => {
    if (!uf) { setCities([]); return; }
    setCitiesLoading(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      const data = await res.json();
      setCities(data.map((m: any) => m.nome).sort());
    } catch {
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  const lookupCep = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          academyAddress: data.logradouro || f.academyAddress,
          academyCity: data.localidade || f.academyCity,
          academyState: data.uf || f.academyState,
          academyNeighborhood: data.bairro || f.academyNeighborhood,
        }));
        if (data.uf) fetchCities(data.uf);
      }
    } catch {
      // silencioso
    } finally {
      setCepLoading(false);
    }
  }, []);

  const load = () => {
    setLoading(true);
    api.admin.listUsers()
      .then(({ users: list }) => setUsers(list))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Roles que este usuário pode criar/atribuir
  const creatableRoles = Object.entries(ROLE_HIERARCHY)
    .filter(([role, lvl]) => role !== 'admin' && lvl < myLevel)
    .map(([r]) => r);

  const q = search.toLowerCase();
  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.academy || '').toLowerCase().includes(q) ||
      (u.academyName || '').toLowerCase().includes(q) ||
      (u.academyCity || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter !== 'all') {
      const eff = u.effectiveStatus || 'none';
      if (eff !== statusFilter) return false;
    }

    return true;
  });

  const statusCounts = useMemo(() => {
    const counts = { all: users.length, active: 0, trial: 0, trial_expired: 0, past_due: 0, suspended: 0, none: 0 };
    for (const u of users) {
      const eff = u.effectiveStatus || 'none';
      if (eff in counts) counts[eff as keyof typeof counts]++;
      else counts.none++;
    }
    return counts;
  }, [users]);

  // Usuários calculados para a exportação
  const exportCandidates = useMemo(() => {
    let list = exportSource === 'filtered' ? filtered : users;

    if (exportRole !== 'all') {
      list = list.filter((u) => {
        if (exportRole === 'academy') return u.role === 'academy' || u.role === 'admin' || u.isAcademyAdmin;
        return u.role === exportRole;
      });
    }

    if (exportSubStatus !== 'all') {
      list = list.filter((u) => {
        const status = u.subscription?.status;
        if (exportSubStatus === 'none') return !status;
        return status === exportSubStatus;
      });
    }

    if (exportBelt !== 'all') {
      list = list.filter((u) => (u.belt || '').toLowerCase() === exportBelt.toLowerCase());
    }

    return list;
  }, [exportSource, filtered, users, exportRole, exportSubStatus, exportBelt]);

  const activeColumnsCount = useMemo(() => {
    return EXPORT_COLUMNS.filter((c) => selectedCols[c.id]).length;
  }, [selectedCols]);

  const selectPresetCols = (type: 'default' | 'contacts' | 'financial' | 'all' | 'none') => {
    if (type === 'all') {
      const all: Record<string, boolean> = {};
      EXPORT_COLUMNS.forEach((c) => { all[c.id] = true; });
      setSelectedCols(all);
    } else if (type === 'none') {
      setSelectedCols({});
    } else if (type === 'default') {
      setSelectedCols({ ...DEFAULT_SELECTED_COLS });
    } else if (type === 'contacts') {
      setSelectedCols({ name: true, email: true, phone: true });
    } else if (type === 'financial') {
      setSelectedCols({
        name: true,
        email: true,
        role: true,
        subStatus: true,
        subPlan: true,
        subPrice: true,
        subPeriodEnd: true,
        firstPaymentDate: true,
        lastPaymentDate: true,
        totalPaid: true,
        paymentsCount: true,
      });
    }
  };

  const handleExecuteExport = () => {
    const list = exportCandidates;
    if (list.length === 0) {
      alert('Nenhum usuário corresponde aos filtros selecionados para exportação.');
      return;
    }

    const activeCols = EXPORT_COLUMNS.filter((c) => selectedCols[c.id]);
    if (activeCols.length === 0) {
      alert('Por favor, selecione ao menos uma coluna para exportar.');
      return;
    }

    const headers = activeCols.map((c) => c.label);
    const rows = list.map((u) => {
      const sub = u.subscription;
      const createdAt = u.createdAt ? new Date(u.createdAt) : null;
      const accountDays = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / 86400000) : 0;

      return activeCols.map((c) => {
        switch (c.id) {
          case 'name': return u.name || '';
          case 'email': return u.email || '';
          case 'phone': return u.phone || '';
          case 'role': return ROLE_LABEL[u.role] || u.role || '';
          case 'effectiveStatus':
            if (u.effectiveStatus === 'active') return 'Em dia';
            if (u.effectiveStatus === 'trial') return `Trial Ativo (${u.trialDaysDiff ?? 0}d restantes)`;
            if (u.effectiveStatus === 'trial_expired') return `Trial Expirado (há ${Math.abs(u.trialDaysDiff ?? 0)}d)`;
            if (u.effectiveStatus === 'past_due') return 'Inadimplente (Atrasado)';
            if (u.effectiveStatus === 'suspended') return 'Suspenso / Cancelado';
            return 'Sem plano';
          case 'belt': return u.belt || '';
          case 'stripes': return u.stripes ?? 0;
          case 'academy': return u.academyName || u.academy || '';
          case 'academyCity': return u.academyCity || '';
          case 'academyState': return u.academyState || '';
          case 'subStatus':
            if (!sub) return 'Sem assinatura';
            if (sub.status === 'active') return 'Ativa';
            if (sub.status === 'trial') return 'Trial';
            if (sub.status === 'past_due') return 'Atrasada';
            return sub.status;
          case 'subPlan': return sub?.planName || sub?.planId || '';
          case 'subPrice': return sub?.planPrice !== undefined ? Number(sub.planPrice) : '';
          case 'subPeriodEnd': return sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR') : '';
          case 'firstPaymentDate': return u.firstPayment?.date ? new Date(u.firstPayment.date).toLocaleDateString('pt-BR') : '';
          case 'lastPaymentDate': return u.lastPayment?.date ? new Date(u.lastPayment.date).toLocaleDateString('pt-BR') : '';
          case 'totalPaid': return u.totalPaid !== undefined ? Number(u.totalPaid) : 0;
          case 'paymentsCount': return u.paymentsCount ?? 0;
          case 'createdAt': return createdAt ? createdAt.toLocaleDateString('pt-BR') : '';
          case 'accountDays': return accountDays;
          case 'communityModerator': return u.communityModerator ? 'Sim' : 'Não';
          default: return '';
        }
      });
    });

    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = activeCols.map((c) => ({
      wch: Math.max(c.label.length + 3, 14),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuários');

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `bjjrats-usuarios-${dateStr}.${exportFormat}`;

    if (exportFormat === 'csv') {
      XLSX.writeFile(wb, fileName, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
    }

    setExportModalOpen(false);
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditTarget(u);
    const academyRole = u.role === 'academy' || u.role === 'admin' || u.isAcademyAdmin === true;
    setForm({ name: u.name, email: u.email, password: '', role: academyRole ? 'academy' : u.role ?? 'student', belt: u.belt ?? 'Branca', phone: u.phone ?? '', academy: u.academy ?? '', academyName: u.academyName ?? '', academyAddress: u.academyAddress ?? '', academyCity: u.academyCity ?? '', academyState: u.academyState ?? '', academyCnpj: u.academyCnpj ?? '', academyCep: u.academyCep ?? '', academyNumber: u.academyNumber ?? '', academyNeighborhood: u.academyNeighborhood ?? '', academyComplement: u.academyComplement ?? '' });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }
    if (!editTarget && !form.password.trim()) {
      setError('Senha é obrigatória para novos usuários.');
      return;
    }
    setSaving(true);
    try {
      const academyFields = {
        academyName: form.academyName, academyAddress: form.academyAddress,
        academyCity: form.academyCity, academyState: form.academyState,
        academyCnpj: form.academyCnpj, academyCep: form.academyCep, academyNumber: form.academyNumber,
        academyNeighborhood: form.academyNeighborhood, academyComplement: form.academyComplement,
        academy: form.academy,
        isAcademyAdmin: form.role === 'academy',
      };
      if (editTarget) {
        const payload: Record<string, unknown> = { name: form.name, belt: form.belt, phone: form.phone, role: form.role, ...academyFields };
        if (form.password) payload.password = form.password;
        await api.admin.updateUser(editTarget.uid, payload);
      } else {
        await api.admin.createUser({
          name: form.name, email: form.email, password: form.password,
          role: form.role, belt: form.belt, phone: form.phone || undefined,
          ...academyFields,
        });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    try {
      await api.admin.deleteUser(u.uid);
      setConfirmDel(null);
      load();
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao deletar.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={headingStyle}>Usuários</h1>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setExportModalOpen(true)}
            style={{
              ...btnSecondaryStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              borderColor: '#444',
              color: '#EEE',
            }}
          >
            <span>📥</span> Exportar Planilha
          </button>
          <button onClick={openCreate} style={btnPrimaryStyle}>+ Novo usuário</button>
        </div>
      </div>

      {/* Filtros Rápidos por Status Financeiro */}
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {[
          { id: 'all', label: 'Todos', count: statusCounts.all, color: '#888' },
          { id: 'active', label: '🟢 Em dia', count: statusCounts.active, color: '#4CAF50' },
          { id: 'trial', label: '🔵 Trial Ativo', count: statusCounts.trial, color: '#3B82F6' },
          { id: 'trial_expired', label: '🟠 Trial Expirado', count: statusCounts.trial_expired, color: '#E87722' },
          { id: 'past_due', label: '🔴 Inadimplentes', count: statusCounts.past_due, color: '#FF4D4D' },
          { id: 'suspended', label: '⚫ Suspensos', count: statusCounts.suspended, color: '#888' },
          { id: 'none', label: '⚪ Sem Plano', count: statusCounts.none, color: '#666' },
        ].map((tab) => {
          const active = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              style={{
                background: active ? '#222' : '#111',
                border: `1px solid ${active ? tab.color : '#282828'}`,
                color: active ? '#FFF' : '#AAA',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: active ? 700 : 600,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  background: active ? tab.color : '#222',
                  color: active && (tab.id === 'active' || tab.id === 'trial_expired') ? '#000' : '#FFF',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '10px',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={inputStyle}
      />

      {/* Tabela */}
      {loading ? (
        <p style={mutedStyle}>Carregando...</p>
      ) : filtered.length === 0 ? (
        <p style={mutedStyle}>Nenhum usuário encontrado.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Barlow Condensed, sans-serif' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #CC0000' }}>
                {['Nome', 'E-mail', 'Role', 'Status Financeiro', 'Plano', 'Valor', 'Vencimento', '1º Pagamento', 'Últ. Pagamento', 'Total Pago', 'Conta', 'Ações'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const sub = u.subscription;
                const pay = u.lastPayment;
                const firstPay = u.firstPayment;
                const createdAt = u.createdAt ? new Date(u.createdAt) : null;
                const accountDays = createdAt
                  ? Math.floor((Date.now() - createdAt.getTime()) / 86400000)
                  : 0;
                return (
                <tr key={u.uid} style={{ borderBottom: '1px solid #1A1A1A' }}>
                  <td style={tdStyle}>{u.name}</td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: '0.8rem' }}>{u.email}</td>
                  <td style={tdStyle}><RoleBadge role={u.role} /></td>
                  <td style={tdStyle}><StatusBadge user={u} /></td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.8rem', color: '#CCC', fontWeight: 600 }}>
                      {sub?.planName || sub?.planId || (u.effectiveStatus === 'trial' ? 'Período Grátis' : '—')}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#AAA' }}>
                    {sub ? `R$ ${(sub.planPrice ?? 0).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {sub?.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {firstPay ? (
                      <div>
                        <span style={{ color: '#CCC', fontWeight: 700 }}>
                          {new Date(firstPay.date).toLocaleDateString('pt-BR')}
                        </span>
                        <span style={{ display: 'block', color: '#777', fontSize: '0.7rem' }}>
                          R$ {Number(firstPay.amount).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {pay ? (
                      <div>
                        <span style={{ color: '#4CAF50', fontWeight: 700 }}>
                          {new Date(pay.date).toLocaleDateString('pt-BR')}
                        </span>
                        <span style={{ display: 'block', color: '#AAA', fontSize: '0.7rem' }}>
                          R$ {Number(pay.amount).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {u.totalPaid && u.totalPaid > 0 ? (
                      <div>
                        <span style={{ color: '#FFF', fontWeight: 800 }}>
                          R$ {Number(u.totalPaid).toFixed(2)}
                        </span>
                        <span style={{ display: 'block', color: '#666', fontSize: '0.68rem' }}>
                          {u.paymentsCount || 1}x pago{u.paymentsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#666', fontSize: '0.75rem' }}>
                    {accountDays > 0 ? `${accountDays}d` : 'Hoje'}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {me?.role === 'superadmin' && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                await api.admin.toggleModerator(u.uid);
                                load();
                              } catch (e: any) {
                                alert(e?.message ?? 'Erro ao alternar moderador.');
                              }
                            }}
                            style={{
                              ...btnSmallStyle,
                              color: u.communityModerator ? '#CC0000' : '#00CC00',
                              borderColor: u.communityModerator ? '#CC000066' : '#00CC0066',
                            }}
                          >
                            {u.communityModerator ? 'Remover Mod' : 'Tornar Mod'}
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.admin.giveTrial(u.uid);
                                load();
                              } catch (e: any) {
                                alert(e?.message ?? 'Erro ao conceder trial.');
                              }
                            }}
                            style={{
                              ...btnSmallStyle,
                              color: '#3B82F6',
                              borderColor: '#3B82F666',
                            }}
                          >
                            {u.trialEndsAt && new Date(u.trialEndsAt) > new Date() ? 'Renovar Trial' : '30 dias grátis'}
                          </button>
                        </>
                      )}
                      <button onClick={() => openEdit(u)} style={btnSmallStyle}>Editar</button>
                      <button onClick={() => setConfirmDel(u)} style={{ ...btnSmallStyle, color: '#CC0000', borderColor: '#CC000066' }}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <Overlay onClick={() => setModalOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ ...headingStyle, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              {editTarget ? 'Editar usuário' : 'Novo usuário'}
            </h2>

            {editTarget && (
              <div style={{
                background: '#0D0D0D', border: '1px solid #222',
                borderLeft: '3px solid #CC0000', borderRadius: '4px',
                padding: '0.75rem', marginBottom: '1rem',
              }}>
                <p style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.75rem',
                  color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem',
                }}>
                  💳 Resumo Financeiro & Pagamentos
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', display: 'block' }}>1º Pagamento</span>
                    <span style={{ fontSize: '0.8rem', color: '#CCC', fontWeight: 600 }}>
                      {editTarget.firstPayment ? `${new Date(editTarget.firstPayment.date).toLocaleDateString('pt-BR')} (R$ ${Number(editTarget.firstPayment.amount).toFixed(2)})` : 'Nenhum'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', display: 'block' }}>Último Pagamento</span>
                    <span style={{ fontSize: '0.8rem', color: '#4CAF50', fontWeight: 700 }}>
                      {editTarget.lastPayment ? `${new Date(editTarget.lastPayment.date).toLocaleDateString('pt-BR')} (R$ ${Number(editTarget.lastPayment.amount).toFixed(2)})` : 'Nenhum'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', display: 'block' }}>Total Acumulado</span>
                    <span style={{ fontSize: '0.8rem', color: '#FFF', fontWeight: 800 }}>
                      R$ {Number(editTarget.totalPaid || 0).toFixed(2)} ({editTarget.paymentsCount || 0} faturas)
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', display: 'block' }}>Plano / Vencimento</span>
                    <span style={{ fontSize: '0.8rem', color: '#E87722', fontWeight: 600 }}>
                      {editTarget.subscription?.planName || 'Sem plano'}
                      {editTarget.subscription?.currentPeriodEnd ? ` (até ${new Date(editTarget.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')})` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Field label="Nome" required>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="E-mail" required>
              <input style={inputStyle} value={form.email} disabled={!!editTarget}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label={editTarget ? 'Nova senha (deixe em branco para manter)' : 'Senha'} required={!editTarget}>
              <input type="password" style={inputStyle} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
            <Field label="Role">
              <select style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                ))}
                {/* Se editando um usuário existente com role igual ao meu, mostra como desabilitado */}
                {editTarget && !creatableRoles.includes(form.role) && (
                  <option value={form.role} disabled>{ROLE_LABEL[form.role] ?? form.role}</option>
                )}
              </select>
            </Field>
            {form.role !== 'academy' && (
              <Field label="Faixa">
                <select style={inputStyle} value={form.belt} onChange={(e) => setForm((f) => ({ ...f, belt: e.target.value }))}>
                  {BELTS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
            )}
            <Field label="Telefone">
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>

            {form.role === 'academy' || form.role === 'professor' ? (
              <>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid #2A2A2A', paddingTop: '0.75rem' }}>DADOS DA ACADEMIA</p>
                <Field label="Nome da Academia">
                  <input style={inputStyle} value={form.academyName} onChange={(e) => setForm((f) => ({ ...f, academyName: e.target.value }))} />
                </Field>
                <Field label="CNPJ">
                  <input style={inputStyle} value={form.academyCnpj} onChange={(e) => setForm((f) => ({ ...f, academyCnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
                </Field>
                <Field label="CEP">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} value={form.academyCep}
                      onChange={(e) => setForm((f) => ({ ...f, academyCep: e.target.value }))}
                      onBlur={() => lookupCep(form.academyCep)}
                      placeholder="00000-000" />
                    {cepLoading && <span style={{ color: '#888', fontSize: '0.7rem' }}>buscando...</span>}
                  </div>
                </Field>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 2 }}>
                    <Field label="Endereço">
                      <input style={inputStyle} value={form.academyAddress} onChange={(e) => setForm((f) => ({ ...f, academyAddress: e.target.value }))} placeholder="Rua, Avenida..." />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Número">
                      <input style={inputStyle} value={form.academyNumber} onChange={(e) => setForm((f) => ({ ...f, academyNumber: e.target.value }))} placeholder="Nº" />
                    </Field>
                  </div>
                </div>
                <Field label="Bairro">
                  <input style={inputStyle} value={form.academyNeighborhood} onChange={(e) => setForm((f) => ({ ...f, academyNeighborhood: e.target.value }))} />
                </Field>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 2 }}>
                    <Field label="Cidade">
                      <select style={inputStyle} value={form.academyCity} onChange={(e) => setForm((f) => ({ ...f, academyCity: e.target.value }))}>
                        <option value="">SELECIONE A CIDADE</option>
                        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {citiesLoading && <span style={{ color: '#888', fontSize: '0.65rem', marginTop: '0.25rem', display: 'block' }}>carregando cidades...</span>}
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Estado">
                      <select style={inputStyle} value={form.academyState}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, academyState: e.target.value, academyCity: '' }));
                          fetchCities(e.target.value);
                        }}
                      >
                        <option value="">UF</option>
                        {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
                <Field label="Complemento">
                  <input style={inputStyle} value={form.academyComplement} onChange={(e) => setForm((f) => ({ ...f, academyComplement: e.target.value }))} placeholder="Sala, bloco..." />
                </Field>
              </>
            ) : null}

            {error && <p style={{ color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} style={btnSecondaryStyle} disabled={saving}>Cancelar</button>
              <button onClick={handleSave} style={btnPrimaryStyle} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Confirmação de exclusão */}
      {confirmDel && (
        <Overlay onClick={() => setConfirmDel(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ ...headingStyle, fontSize: '1.1rem', marginBottom: '0.75rem' }}>Confirmar exclusão</h2>
            <p style={{ color: '#AAA', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Tem certeza que deseja excluir <strong style={{ color: '#FFF' }}>{confirmDel.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDel(null)} style={btnSecondaryStyle}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDel)} style={{ ...btnPrimaryStyle, background: '#CC0000' }}>Excluir</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Modal de Exportação de Usuários */}
      {exportModalOpen && (
        <Overlay onClick={() => setExportModalOpen(false)}>
          <div
            style={{
              ...modalStyle,
              maxWidth: '620px',
              border: '1px solid #444',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ ...headingStyle, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📥</span> Exportar Planilha de Usuários
              </h2>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* SEÇÃO 1: FILTROS DE USUÁRIO */}
            <div style={{ background: '#161616', border: '1px solid #262626', borderRadius: '4px', padding: '0.85rem', marginBottom: '1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.8rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.65rem' }}>
                1. Quem você quer extrair?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                <div>
                  <label style={exportLabelStyle}>Origem dos dados</label>
                  <select
                    style={selectStyle}
                    value={exportSource}
                    onChange={(e) => setExportSource(e.target.value as any)}
                  >
                    <option value="all">Base completa ({users.length})</option>
                    <option value="filtered">Busca atual na tela ({filtered.length})</option>
                  </select>
                </div>

                <div>
                  <label style={exportLabelStyle}>Perfil / Função</label>
                  <select
                    style={selectStyle}
                    value={exportRole}
                    onChange={(e) => setExportRole(e.target.value)}
                  >
                    <option value="all">Todos os perfis</option>
                    <option value="student">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="academy">Academia</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label style={exportLabelStyle}>Status Assinatura</label>
                  <select
                    style={selectStyle}
                    value={exportSubStatus}
                    onChange={(e) => setExportSubStatus(e.target.value)}
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativa</option>
                    <option value="trial">Trial</option>
                    <option value="past_due">Atrasada / Vencida</option>
                    <option value="none">Sem assinatura</option>
                  </select>
                </div>

                <div>
                  <label style={exportLabelStyle}>Faixa</label>
                  <select
                    style={selectStyle}
                    value={exportBelt}
                    onChange={(e) => setExportBelt(e.target.value)}
                  >
                    <option value="all">Todas as faixas</option>
                    {BELTS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: COLUNAS */}
            <div style={{ background: '#161616', border: '1px solid #262626', borderRadius: '4px', padding: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.8rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  2. Quais colunas incluir?
                </p>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => selectPresetCols('default')} style={btnPresetStyle}>Padrão</button>
                  <button type="button" onClick={() => selectPresetCols('contacts')} style={btnPresetStyle}>Apenas Contatos</button>
                  <button type="button" onClick={() => selectPresetCols('financial')} style={btnPresetStyle}>Financeiro</button>
                  <button type="button" onClick={() => selectPresetCols('all')} style={btnPresetStyle}>Todas</button>
                  <button type="button" onClick={() => selectPresetCols('none')} style={btnPresetStyle}>Limpar</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {EXPORT_COLUMNS.map((col) => {
                  const checked = !!selectedCols[col.id];
                  return (
                    <label
                      key={col.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 0.5rem',
                        background: checked ? '#242424' : '#121212',
                        border: `1px solid ${checked ? '#CC000088' : '#222'}`,
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: checked ? '#FFF' : '#888',
                        fontFamily: 'Barlow Condensed, sans-serif',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setSelectedCols((prev) => ({ ...prev, [col.id]: e.target.checked }))}
                        style={{ accentColor: '#CC0000', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: checked ? 700 : 500 }}>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 3: FORMATO DO ARQUIVO */}
            <div style={{ background: '#161616', border: '1px solid #262626', borderRadius: '4px', padding: '0.85rem', marginBottom: '1rem' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.8rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
                3. Formato do arquivo
              </p>
              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#DDD', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="xlsx"
                    checked={exportFormat === 'xlsx'}
                    onChange={() => setExportFormat('xlsx')}
                    style={{ accentColor: '#CC0000' }}
                  />
                  <span>Excel (.xlsx) <strong style={{ color: '#4CAF50', fontSize: '0.75rem' }}>(Recomendado)</strong></span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#DDD', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                    style={{ accentColor: '#CC0000' }}
                  />
                  <span>CSV (.csv)</span>
                </label>
              </div>
            </div>

            {/* RESUMO / PREVIEW & AÇÕES */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid #222', paddingTop: '1rem' }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', color: '#888' }}>
                {exportCandidates.length > 0 ? (
                  <span>
                    Pronto para exportar: <strong style={{ color: '#4CAF50' }}>{exportCandidates.length}</strong> usuário(s) e <strong style={{ color: '#FFF' }}>{activeColumnsCount}</strong> coluna(s).
                  </span>
                ) : (
                  <span style={{ color: '#CC0000' }}>
                    Nenhum usuário corresponde aos filtros selecionados.
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  style={btnSecondaryStyle}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  disabled={exportCandidates.length === 0 || activeColumnsCount === 0}
                  style={{
                    ...btnPrimaryStyle,
                    opacity: exportCandidates.length === 0 || activeColumnsCount === 0 ? 0.4 : 1,
                    cursor: exportCandidates.length === 0 || activeColumnsCount === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  📥 Baixar {exportFormat === 'csv' ? 'CSV' : 'Planilha Excel'}
                </button>
              </div>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: '1rem',
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
        {label}{required && <span style={{ color: '#CC0000' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  academy:    'Academia',
  admin:      'Academia',
  professor:  'Professor',
  student:    'Aluno',
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const headingStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 800,
  fontSize: '1.5rem',
  color: '#FFF',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  margin: 0,
};

const mutedStyle: React.CSSProperties = {
  color: '#555',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.9rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1A1A1A',
  border: '1px solid #333',
  color: '#FFF',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.9rem',
  padding: '0.55rem 0.75rem',
  marginBottom: '0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const thStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  fontSize: '0.7rem',
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  padding: '0.6rem 0.75rem',
  textAlign: 'left',
  background: '#111',
};

const tdStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.9rem',
  color: '#CCC',
  padding: '0.7rem 0.75rem',
};

const modalStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #333',
  padding: '1.5rem',
  width: '100%',
  maxWidth: '460px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const btnPrimaryStyle: React.CSSProperties = {
  background: '#CC0000',
  color: '#FFF',
  border: 'none',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 800,
  fontSize: '0.85rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '0.6rem 1.25rem',
  cursor: 'pointer',
};

const btnSecondaryStyle: React.CSSProperties = {
  background: 'none',
  color: '#AAA',
  border: '1px solid #333',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  fontSize: '0.85rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '0.6rem 1.25rem',
  cursor: 'pointer',
};

const btnSmallStyle: React.CSSProperties = {
  background: 'none',
  color: '#888',
  border: '1px solid #333',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '3px 10px',
  cursor: 'pointer',
};

const exportLabelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  fontSize: '0.7rem',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.25rem',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: '#111',
  border: '1px solid #333',
  color: '#FFF',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.85rem',
  padding: '0.45rem 0.5rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnPresetStyle: React.CSSProperties = {
  background: '#222',
  color: '#AAA',
  border: '1px solid #333',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  padding: '2px 8px',
  cursor: 'pointer',
  borderRadius: '2px',
};
