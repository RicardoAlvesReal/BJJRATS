// BJJRats — Admin Users Management

import { useEffect, useState } from 'react';
import api, { type AdminUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_HIERARCHY } from '@/lib/roleHierarchy';
import { RoleBadge } from './AdminDashboard';

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
  belt: string;
  phone: string;
}

const EMPTY_FORM: UserForm = { name: '', email: '', password: '', role: 'student', belt: 'Branca', phone: '' };

const BELTS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

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
    .filter(([, lvl]) => lvl < myLevel)
    .map(([r]) => r);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditTarget(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role ?? 'student', belt: u.belt ?? 'Branca', phone: u.phone ?? '' });
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
      if (editTarget) {
        const payload: Record<string, unknown> = { name: form.name, belt: form.belt, phone: form.phone, role: form.role };
        if (form.password) payload.password = form.password;
        await api.admin.updateUser(editTarget.uid, payload);
      } else {
        await api.admin.createUser({
          name: form.name, email: form.email, password: form.password,
          role: form.role, belt: form.belt, phone: form.phone || undefined,
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
        <button onClick={openCreate} style={btnPrimaryStyle}>+ Novo usuário</button>
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
                {['Nome', 'E-mail', 'Role', 'Faixa', 'Ações'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.uid} style={{ borderBottom: '1px solid #1A1A1A' }}>
                  <td style={tdStyle}>{u.name}</td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: '0.8rem' }}>{u.email}</td>
                  <td style={tdStyle}><RoleBadge role={u.role} /></td>
                  <td style={{ ...tdStyle, color: '#AAA' }}>{u.belt ?? '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEdit(u)} style={btnSmallStyle}>Editar</button>
                      <button onClick={() => setConfirmDel(u)} style={{ ...btnSmallStyle, color: '#CC0000', borderColor: '#CC000066' }}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
            <Field label="Faixa">
              <select style={inputStyle} value={form.belt} onChange={(e) => setForm((f) => ({ ...f, belt: e.target.value }))}>
                {BELTS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Telefone">
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>

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
  admin:      'Admin',
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
