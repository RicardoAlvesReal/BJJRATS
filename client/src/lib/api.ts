/**
 * Camada de acesso à API REST.
 * Todas as chamadas passam pelo token JWT armazenado em localStorage.
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

function getToken(): string | null {
  return localStorage.getItem('bjjrats_token');
}

async function apiFetch<T>(urlPath: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  // multipart: não definir Content-Type (o browser define boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(`${BASE}${urlPath}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw err;
  }
  return res.json() as Promise<T>;
}

// ─── Tipos mínimos usados no cliente ─────────────────────────────────────────

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photo?: string;
  belt: string;
  stripes?: number;
  academy?: string;
  academyId?: string;
  professor?: string;
  dob?: string;
  sex?: string;
  weightKg?: number;
  heightCm?: number;
  phone?: string;
  address?: string;
  bjjSince?: string;
  xp?: number;
  totalTrainings?: number;
  totalMinutes?: number;
  streak?: number;
  athleteType?: string;
  isAcademyAdmin?: boolean;
  role?: string;
  academyName?: string;
  academyAddress?: string;
  academyCity?: string;
  academyState?: string;
  academyLogoUrl?: string;
  professorPhotoUrl?: string;
  createdAt?: string;
}

export interface Training {
  id: string;
  uid: string;
  date: string;
  durationMinutes: number;
  type: string;
  notes?: string;
  xp?: number;
  createdAt?: string;
}

export interface ExtraTraining {
  id: string;
  uid: string;
  date: string;
  type: string;
  durationMinutes?: number;
  notes?: string;
  createdAt?: string;
}

export interface Goal {
  id: string;
  uid: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline?: string;
  completed?: boolean;
  createdAt?: string;
}

export interface Post {
  id: string;
  authorUid: string;
  type: string;
  content?: string;
  mediaUrl?: string;
  academyId?: string;
  likes?: string[];
  createdAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorUid: string;
  content: string;
  createdAt?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  academyId?: string;
  createdByUid?: string;
  createdAt?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  academyId?: string;
  createdByUid?: string;
  participants?: string[];
  createdAt?: string;
}

export interface Notification {
  id: string;
  toUid: string;
  fromUid?: string;
  type: string;
  message: string;
  read?: boolean;
  createdAt?: string;
}

export interface Payment {
  id: string;
  studentUid: string;
  professorUid: string;
  month: string;
  amount: number;
  paid?: boolean;
  paidAt?: string;
  dueDate?: string;
  createdAt?: string;
}

export interface Enrollment {
  id: string;
  studentUid: string;
  professorUid: string;
  academyId?: string;
  status?: string;
  createdAt?: string;
}

export interface AcademyRequest {
  id: string;
  studentUid: string;
  professorUid: string;
  academyId?: string;
  status?: string;
  message?: string;
  createdAt?: string;
}

export interface ClassSchedule {
  id: string;
  academyId: string;
  professorUid: string;
  weekday: string;
  startTime: string;
  endTime?: string;
  title?: string;
}

export interface Promotion {
  id: string;
  studentUid: string;
  professorUid: string;
  toBelt: string;
  toStripes: number;
  promotedAt?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (data: Record<string, unknown>) =>
    apiFetch<{ token: string; user: UserProfile }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => apiFetch<UserProfile>('/api/auth/me'),

  resetPassword: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUser extends UserProfile {
  role: string;
}

export const admin = {
  listUsers: () =>
    apiFetch<{ users: AdminUser[] }>('/api/admin/users'),

  createUser: (data: {
    name: string; email: string; password: string;
    role?: string; belt?: string; academyId?: string | null;
    phone?: string;
  }) =>
    apiFetch<{ user: AdminUser }>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (uid: string, data: Partial<AdminUser> & { password?: string }) =>
    apiFetch<{ user: AdminUser }>(`/api/admin/users/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteUser: (uid: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/users/${uid}`, { method: 'DELETE' }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = {
  list: (params: { role?: string; search?: string; academyId?: string; inviteCode?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<UserProfile[]>(`/api/users${q ? `?${q}` : ''}`);
  },
  get: (uid: string) => apiFetch<UserProfile>(`/api/users/${uid}`),
  update: (uid: string, data: Partial<UserProfile>) =>
    apiFetch<UserProfile>(`/api/users/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Trainings ────────────────────────────────────────────────────────────────

export const trainings = {
  list: (uid?: string) => apiFetch<Training[]>(`/api/trainings${uid ? `?uid=${uid}` : ''}`),
  get: (id: string) => apiFetch<Training>(`/api/trainings/${id}`),
  create: (data: Omit<Training, 'id' | 'createdAt'>) =>
    apiFetch<Training>('/api/trainings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Training>) =>
    apiFetch<Training>(`/api/trainings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ success: boolean }>(`/api/trainings/${id}`, { method: 'DELETE' }),
};

// ─── Extra Trainings ──────────────────────────────────────────────────────────

export const extraTrainings = {
  list: (uid?: string) => apiFetch<ExtraTraining[]>(`/api/extra-trainings${uid ? `?uid=${uid}` : ''}`),
  create: (data: Omit<ExtraTraining, 'id' | 'createdAt'>) =>
    apiFetch<ExtraTraining>('/api/extra-trainings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ExtraTraining>) =>
    apiFetch<ExtraTraining>(`/api/extra-trainings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ success: boolean }>(`/api/extra-trainings/${id}`, { method: 'DELETE' }),
};

// ─── Goals ────────────────────────────────────────────────────────────────────

export const goals = {
  list: (uid?: string) => apiFetch<Goal[]>(`/api/goals${uid ? `?uid=${uid}` : ''}`),
  create: (data: Omit<Goal, 'id' | 'createdAt'>) =>
    apiFetch<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Goal>) =>
    apiFetch<Goal>(`/api/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ success: boolean }>(`/api/goals/${id}`, { method: 'DELETE' }),
};

// ─── Posts ────────────────────────────────────────────────────────────────────

export const posts = {
  list: (params: { academyId?: string; type?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Post[]>(`/api/posts${q ? `?${q}` : ''}`);
  },
  get: (id: string) => apiFetch<Post>(`/api/posts/${id}`),
  create: (data: Omit<Post, 'id' | 'createdAt'>) =>
    apiFetch<Post>('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Post>) =>
    apiFetch<Post>(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ success: boolean }>(`/api/posts/${id}`, { method: 'DELETE' }),
  getComments: (postId: string) => apiFetch<Comment[]>(`/api/posts/${postId}/comments`),
  addComment: (postId: string, data: { content: string }) =>
    apiFetch<Comment>(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  deleteComment: (postId: string, commentId: string) =>
    apiFetch<{ success: boolean }>(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
};

// ─── Events ───────────────────────────────────────────────────────────────────

export const events = {
  list: () => apiFetch<Event[]>('/api/events'),
  get: (id: string) => apiFetch<Event>(`/api/events/${id}`),
  create: (data: Omit<Event, 'id' | 'createdAt'>) =>
    apiFetch<Event>('/api/events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Event>) =>
    apiFetch<Event>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ success: boolean }>(`/api/events/${id}`, { method: 'DELETE' }),
};

// ─── Challenges ───────────────────────────────────────────────────────────────

export const challenges = {
  list: () => apiFetch<Challenge[]>('/api/challenges'),
  get: (id: string) => apiFetch<Challenge>(`/api/challenges/${id}`),
  create: (data: Omit<Challenge, 'id' | 'createdAt'>) =>
    apiFetch<Challenge>('/api/challenges', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Challenge>) =>
    apiFetch<Challenge>(`/api/challenges/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ success: boolean }>(`/api/challenges/${id}`, { method: 'DELETE' }),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = {
  list: () => apiFetch<Notification[]>('/api/notifications'),
  create: (data: Omit<Notification, 'id' | 'createdAt'>) =>
    apiFetch<Notification>('/api/notifications', { method: 'POST', body: JSON.stringify(data) }),
  markRead: (id: string) =>
    apiFetch<Notification>(`/api/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ read: true }) }),
  markAllRead: () => apiFetch<{ updated: number }>('/api/notifications/read-all', { method: 'PATCH' }),
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = {
  list: (params: { professorUid?: string; studentUid?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Payment[]>(`/api/payments${q ? `?${q}` : ''}`);
  },
  create: (data: Omit<Payment, 'id' | 'createdAt'>) =>
    apiFetch<Payment>('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Payment>) =>
    apiFetch<Payment>(`/api/payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Enrollments ──────────────────────────────────────────────────────────────

export const enrollments = {
  list: (params: { professorUid?: string; studentUid?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Enrollment[]>(`/api/enrollments${q ? `?${q}` : ''}`);
  },
  create: (data: Omit<Enrollment, 'id' | 'createdAt'>) =>
    apiFetch<Enrollment>('/api/enrollments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Enrollment>) =>
    apiFetch<Enrollment>(`/api/enrollments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ success: boolean }>(`/api/enrollments/${id}`, { method: 'DELETE' }),
};

// ─── Academy Requests ─────────────────────────────────────────────────────────

export const academyRequests = {
  list: (params: { professorUid?: string; studentUid?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<AcademyRequest[]>(`/api/academy-requests${q ? `?${q}` : ''}`);
  },
  create: (data: Omit<AcademyRequest, 'id' | 'createdAt' | 'studentUid'>) =>
    apiFetch<AcademyRequest>('/api/academy-requests', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<AcademyRequest>) =>
    apiFetch<AcademyRequest>(`/api/academy-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Classes ──────────────────────────────────────────────────────────────────

export const classes = {
  listSchedules: (academyId?: string) =>
    apiFetch<ClassSchedule[]>(`/api/classes/schedules${academyId ? `?academyId=${academyId}` : ''}`),
  createSchedule: (data: Omit<ClassSchedule, 'id'>) =>
    apiFetch<ClassSchedule>('/api/classes/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: string, data: Partial<ClassSchedule>) =>
    apiFetch<ClassSchedule>(`/api/classes/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSchedule: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/classes/schedules/${id}`, { method: 'DELETE' }),
  listCheckIns: (params: { academyId?: string; studentUid?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Record<string, unknown>[]>(`/api/classes/check-ins${q ? `?${q}` : ''}`);
  },
  getCheckIns: (params: { professorUid?: string; dateKey?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Record<string, unknown>[]>(`/api/classes/check-ins${q ? `?${q}` : ''}`);
  },
  createCheckIn: (data: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/api/classes/check-ins', { method: 'POST', body: JSON.stringify(data) }),
  deleteCheckIn: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/classes/check-ins/${id}`, { method: 'DELETE' }),
};

// ─── Promotions ───────────────────────────────────────────────────────────────

export const promotions = {
  list: (params: { professorUid?: string; studentUid?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Promotion[]>(`/api/promotions${q ? `?${q}` : ''}`);
  },
  create: (data: Omit<Promotion, 'id'>) =>
    apiFetch<Promotion>('/api/promotions', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Achievements ─────────────────────────────────────────────────────────────

export const achievements = {
  list: (uid?: string) =>
    apiFetch<Record<string, unknown>[]>(`/api/achievements${uid ? `?uid=${uid}` : ''}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/api/achievements', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Upload ───────────────────────────────────────────────────────────────────

export const upload = {
  file: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiFetch<{ url: string }>('/api/upload', {
      method: 'POST',
      body: form,
      headers: {} as Record<string, string>,
    });
    return res.url;
  },
};

// ─── Export padrão agrupado ───────────────────────────────────────────────────

const api = {
  auth,
  users,
  trainings,
  extraTrainings,
  goals,
  posts,
  events,
  challenges,
  notifications,
  payments,
  enrollments,
  academyRequests,
  classes,
  promotions,
  achievements,
  upload,
  admin,
};

export default api;
