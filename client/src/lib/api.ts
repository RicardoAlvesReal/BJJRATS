/**
 * Camada de acesso à API REST.
 * Autenticação via cookie HTTP-only (primário) com fallback para localStorage.
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  const res = await fetch(`${BASE}${urlPath}`, { ...options, headers, signal: controller.signal, credentials: 'include' }).finally(() => clearTimeout(timeoutId));
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || res.statusText) as any;
    err.status = res.status;
    err.code = body.code || body.error;
    err.body = body;
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
  academyLatitude?: number | null;
  academyLongitude?: number | null;
  academyLogoUrl?: string;
  academyCnpj?: string;
  academyCep?: string;
  academyNumber?: string;
  academyNeighborhood?: string;
  academyComplement?: string;
  professorPhotoUrl?: string;
  subscriptionExempt?: boolean;
  communityModerator?: boolean;
  trialRequestsEnabled?: boolean;
  createdAt?: string;
}

export interface SuperadminEmailPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: string;
  pageUrl?: string;
  website?: string;
}

export interface CompanyEmailSettings {
  enabled: boolean;
  provider: 'log' | 'resend' | 'webhook';
  from: string;
  hasResendApiKey: boolean;
  resendApiKeyLast4: string | null;
  webhookUrl: string;
  hasWebhookKey: boolean;
  webhookKeyLast4: string | null;
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
  type?: string;
  date: string;
  time?: string;
  location?: string;
  locationCep?: string;
  locationAddress?: string;
  locationNumber?: string;
  locationNeighborhood?: string;
  locationCity?: string;
  locationState?: string;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  slots?: number;
  price?: string;
  duration?: string;
  registrations?: string[];
  registrationNames?: Record<string, string>;
  registrationBelts?: Record<string, string>;
  registrationsClosed?: boolean;
  academyName?: string;
  academyLogo?: string;
  academyId?: string;
  authorUid?: string;
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
  fromName?: string;
  type: string;
  message: string;
  title?: string;
  body?: string;
  data?: Record<string, any> | null;
  read?: boolean;
  createdAt?: string;
  whatsapp?: WhatsAppAutomationResult;
}

export interface Payment {
  id: string;
  studentUid: string;
  professorUid: string;
  studentName?: string;
  studentEmail?: string;
  month: string;
  amount: number;
  paid?: boolean;
  status?: 'pending' | 'paid' | 'overdue' | 'suspended';
  paidAt?: string;
  dueDate?: string;
  pixKey?: string;
  pixLink?: string;
  paymentLink?: string;
  paymentProvider?: 'manual' | 'asaas';
  asaasPaymentId?: string | null;
  asaasError?: string | null;
  reactivatedEnrollments?: Array<{ id: string; studentUid?: string; status?: string }>;
  suspendedEnrollments?: Array<{ id: string; studentUid?: string; status?: string }>;
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
  academyName?: string;
  professorName?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhoto?: string | null;
  studentBelt?: string;
  status?: string;
  message?: string;
  createdAt?: string;
}

export interface ClassSchedule {
  id: string;
  academyId: string;
  professorUid: string;
  // HorariosTab fields
  days: string[];
  time: string;
  type: string;
  mode: string;
  publico: string;
  durationMin: number;
  notes?: string;
  // legacy
  weekday?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
}

export interface Promotion {
  id: string;
  studentUid: string;
  professorUid: string;
  studentName?: string;
  fromBelt?: string;
  toBelt?: string;
  fromStripes?: number;
  toStripes?: number;
  previousBelt?: string;
  previousStripes?: number;
  newBelt?: string;
  newStripes?: number;
  notes?: string;
  promotedBy?: string;
  promotedAt?: string;
  promotedAtStr?: string;
  createdAt?: string;
}

export interface Competition {
  id: string;
  uid: string;
  name: string;
  date: string;
  location: string;
  category: string;
  weightClass: string;
  result: string;
  notes: string;
  createdAt?: any;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (data: Record<string, unknown>) =>
    apiFetch<{ token: string; user: UserProfile }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (email: string, password: string, turnstileToken?: string) =>
    apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, turnstileToken }) }),

  me: () => apiFetch<UserProfile>('/api/auth/me'),

  logout: () => apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

  resetPassword: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),

  confirmResetPassword: (token: string, newPassword: string) =>
    apiFetch<{ success: boolean; message: string }>('/api/auth/reset-password/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
};

// ─── Passkeys (WebAuthn / Biometria) ─────────────────────────────────────────

export interface PasskeyCredential {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const passkeys = {
  /** Solicita desafio para registrar nova biometria */
  registerChallenge: () =>
    apiFetch<any>('/api/passkeys/register-challenge'),

  /** Finaliza registro da credencial biométrica */
  register: (data: {
    id: string; rawId: string; response: any; type: string; deviceName?: string;
  }) => apiFetch<{ success: boolean }>('/api/passkeys/register', { method: 'POST', body: JSON.stringify(data) }),

  /** Solicita desafio para autenticar com biometria */
  authChallenge: (email: string) =>
    apiFetch<any>('/api/passkeys/auth-challenge', { method: 'POST', body: JSON.stringify({ email }) }),

  /** Finaliza autenticação biométrica */
  auth: (data: { id: string; rawId: string; response: any; type: string }) =>
    apiFetch<{ success: boolean; token: string; user: any }>('/api/passkeys/auth', { method: 'POST', body: JSON.stringify(data) }),

  /** Lista credenciais biométricas do usuário */
  list: () => apiFetch<PasskeyCredential[]>('/api/passkeys/credentials'),

  /** Remove uma credencial biométrica */
  delete: (id: string) => apiFetch<{ success: boolean }>(`/api/passkeys/credentials/${id}`, { method: 'DELETE' }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUser extends UserProfile {
  role: string;
  communityModerator?: boolean;
  trialEndsAt?: string | null;
  subscription?: {
    status: string;
    planId: string;
    planName: string;
    planPrice: number;
    currentPeriodEnd: string;
  } | null;
  lastPayment?: {
    date: string;
    amount: number;
  } | null;
}

export const admin = {
  listUsers: () =>
    apiFetch<{ users: AdminUser[] }>('/api/admin/users'),

  createUser: (data: {
    name: string; email: string; password: string;
    role?: string; belt?: string; academyId?: string | null;
    phone?: string;
    academy?: string;
    academyName?: string;
    academyAddress?: string;
    academyCity?: string;
    academyState?: string;
    academyLatitude?: number | null;
    academyLongitude?: number | null;
    academyCnpj?: string;
    academyCep?: string;
    academyNumber?: string;
    academyNeighborhood?: string;
    academyComplement?: string;
    isAcademyAdmin?: boolean;
  }) =>
    apiFetch<{ user: AdminUser }>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (uid: string, data: Partial<AdminUser> & { password?: string }) =>
    apiFetch<{ user: AdminUser }>(`/api/admin/users/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteUser: (uid: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/users/${uid}`, { method: 'DELETE' }),

  toggleModerator: (uid: string) =>
    apiFetch<{ uid: string; communityModerator: boolean }>(`/api/admin/users/${uid}/toggle-moderator`, { method: 'PATCH' }),

  giveTrial: (uid: string) =>
    apiFetch<{ uid: string; trialEndsAt: string }>(`/api/admin/users/${uid}/give-trial`, { method: 'POST' }),

  plans: {
    list: () => apiFetch<Plan[]>('/api/admin/plans'),
    create: (data: { name: string; slug: string; description?: string; price: number; roleAssigned: string; features?: string[] }) =>
      apiFetch<Plan>('/api/admin/plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Plan>) =>
      apiFetch<Plan>(`/api/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/admin/plans/${id}`, { method: 'DELETE' }),
  },

  getSettings: () => apiFetch<Record<string, string>>('/api/admin/settings'),

  updateSettings: (data: Record<string, string>) =>
    apiFetch<Record<string, string>>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),

  emailAutomation: {
    get: () => apiFetch<CompanyEmailSettings>('/api/admin/email-automation'),
    update: (data: Partial<CompanyEmailSettings> & {
      resendApiKey?: string;
      webhookKey?: string;
      clearResendApiKey?: boolean;
      clearWebhookKey?: boolean;
    }) => apiFetch<CompanyEmailSettings>('/api/admin/email-automation', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    test: (to?: string) => apiFetch<{ success: boolean; provider: string; recipients: number }>('/api/admin/email-automation/test', {
      method: 'POST',
      body: JSON.stringify({ to }),
    }),
  },

  getStats: (days?: number) => apiFetch<AdminStats>(`/api/admin/stats${days ? `?days=${days}` : ''}`),

  getCrmData: () => apiFetch<CrmData>('/api/admin/crm'),

  getMetrics: () => apiFetch<AdminMetrics>('/api/admin/metrics'),

  // Community moderation (superadmin)
  community: {
    stats: () => apiFetch<CommunityStats>('/api/admin/community/stats'),
    deletePost: (id: string) => apiFetch<{ success: boolean }>(`/api/admin/community/posts/${id}`, { method: 'DELETE' }),
    deleteEvent: (id: string) => apiFetch<{ success: boolean }>(`/api/admin/community/events/${id}`, { method: 'DELETE' }),
    deleteChallenge: (id: string) => apiFetch<{ success: boolean }>(`/api/admin/community/challenges/${id}`, { method: 'DELETE' }),
  },

  announcements: {
    list: (all?: boolean) => apiFetch<Announcement[]>(`/api/announcements${all ? '?all=true' : ''}`),
    create: (data: { title: string; content: string; imageUrl?: string; linkUrl?: string; linkText?: string; urgent?: boolean }) =>
      apiFetch<Announcement>('/api/announcements', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Announcement>) =>
      apiFetch<Announcement>(`/api/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/announcements/${id}`, { method: 'DELETE' }),
  },
};

export interface AcademyProfessorLink {
  id: string;
  academyUid: string;
  professorUid: string;
  relationType: 'internal' | 'partner' | string;
  status?: 'active' | 'pending' | 'rejected' | 'removed' | string;
  partnerRevenueSharePercent?: number | null;
  partnerRevenueNotes?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  professorName?: string | null;
  professorEmail?: string | null;
  professorPhone?: string | null;
  professorPhoto?: string | null;
  professorPhotoUrl?: string | null;
  professorBelt?: string | null;
  professorAcademyId?: string | null;
  academyName?: string | null;
  academy?: string | null;
  academyLogoUrl?: string | null;
  assignmentCounts?: Record<string, number>;
}

export interface AcademyStudentProfessorAssignment {
  id: string;
  academyUid: string;
  professorUid: string;
  studentUid: string;
  relationType: 'internal' | 'partner' | string;
  status?: 'active' | 'pending' | 'accepted' | 'rejected' | 'cancelled' | string;
  studentName?: string | null;
  professorName?: string | null;
  academyName?: string | null;
  academy?: string | null;
  notes?: string | null;
  decidedAt?: string | null;
  createdAt?: string;
}

export const academy = {
  getCrmData: () => apiFetch<CrmData>('/api/academy/crm'),
  professors: {
    list: () => apiFetch<AcademyProfessorLink[]>('/api/academy/professors'),
    create: (data: { professorUid?: string; relationType: 'internal' | 'partner'; notes?: string; partnerRevenueSharePercent?: number; partnerRevenueNotes?: string; createAccount?: boolean; email?: string; name?: string; password?: string }) =>
      apiFetch<AcademyProfessorLink>('/api/academy/professors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { relationType?: 'internal' | 'partner'; status?: 'active' | 'removed'; notes?: string; partnerRevenueSharePercent?: number; partnerRevenueNotes?: string }) =>
      apiFetch<AcademyProfessorLink>(`/api/academy/professors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    mine: () => apiFetch<AcademyProfessorLink[]>('/api/academy/professor-invites/mine'),
    respond: (id: string, status: 'accepted' | 'rejected') =>
      apiFetch<AcademyProfessorLink>(`/api/academy/professors/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  studentAssignments: {
    list: (params: { professorUid?: string } = {}) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<AcademyStudentProfessorAssignment[]>(`/api/academy/student-assignments${q ? `?${q}` : ''}`);
    },
    create: (professorUid: string, data: { studentUid: string; notes?: string }) =>
      apiFetch<AcademyStudentProfessorAssignment>(`/api/academy/professors/${professorUid}/assignments`, { method: 'POST', body: JSON.stringify(data) }),
    mine: () => apiFetch<AcademyStudentProfessorAssignment[]>('/api/academy/student-assignments/mine'),
    respond: (id: string, status: 'accepted' | 'rejected') =>
      apiFetch<AcademyStudentProfessorAssignment>(`/api/academy/student-assignments/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    cancel: (id: string) =>
      apiFetch<AcademyStudentProfessorAssignment>(`/api/academy/student-assignments/${id}`, { method: 'PATCH' }),
  },
};

export interface CrmData {
  revenue: {
    totalBilled: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    projectedMonthly: number;
    projectedAnnual: number;
    activeEnrollments: number;
  };
  leads: { status: string; count: number }[];
  revenueMonthly: { month: string; total: number; count: number }[];
  recentPayments: {
    id: string;
    studentName?: string | null;
    studentUid?: string | null;
    amount: number;
    status?: string | null;
    dueDate?: string | null;
    paidAt?: string | null;
  }[];
  leadsDetail?: {
    id: string;
    studentName?: string | null;
    studentEmail?: string | null;
    studentBelt?: string | null;
    studentPhoto?: string | null;
    studentUid?: string | null;
    status?: string | null;
    createdAt?: string | null;
  }[];
  studentStats?: {
    active: number;
    suspended: number;
    cancelled: number;
    total: number;
  };
  enrollmentEvolution?: {
    month: string;
    newEnrollments: number;
  }[];
  studentsByBelt?: {
    belt: string | null;
    count: number;
  }[];
  attendance?: {
    checkInsLast30Days: number;
    totalStudents: number;
    rate: number;
  };
  inactiveStudents?: {
    studentUid: string | null;
    studentName: string | null;
    daysSinceLastCheckIn: number;
  }[];
  defaultingStudents?: {
    id: string;
    studentUid: string | null;
    studentName: string | null;
    amount: number;
    dueDate: Date | string | null;
    status: string | null;
  }[];
}

export interface AdminStats {
  trainings: {
    total: number;
    totalXP: number;
    totalHours: number;
    today: number;
    inRange: number;
  };
  checkInsToday: number;
  userGrowth: { month: string; count: number }[];
  beltDistribution: { belt: string; count: number }[];
  academiesByState: { state: string; count: number }[];
}

export interface AdminMetrics {
  overview: {
    totalBilled: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    countPaid: number;
    countPending: number;
    countOverdue: number;
    totalRows: number;
    dupOverdue: number;
    dupPending: number;
    monthlyProjected: number;
    paidRate: number;
  };
  monthlyRevenue: { month: string; total: number; count: number }[];
  topEarners: {
    professorUid: string;
    name: string;
    role: string | null;
    totalPaid: number;
    countPaid: number;
  }[];
  enrollmentBreakdown: {
    status: string;
    count: number;
    monthly: number;
  }[];
}

export interface CommunityStats {
  totalPosts: number;
  totalEvents: number;
  totalChallenges: number;
  totalComments: number;
  topPosters: { uid: string; count: number }[];
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = {
  list: (params: { role?: string; search?: string; academyId?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<UserProfile[]>(`/api/users${q ? `?${q}` : ''}`);
  },
  get: (uid: string) => apiFetch<UserProfile>(`/api/users/${uid}`),
  update: (uid: string, data: Partial<UserProfile>) =>
    apiFetch<UserProfile>(`/api/users/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  /** Exclui permanentemente a própria conta e todos os dados (LGPD Art. 18) */
  deleteAccount: (uid: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/users/${uid}/account`, { method: 'DELETE' }),
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
  list: (params: { academyId?: string; authorUid?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<Event[]>(`/api/events${q ? `?${q}` : ''}`);
  },
  get: (id: string) => apiFetch<Event>(`/api/events/${id}`),
  create: (data: Omit<Event, 'id' | 'createdAt'>) =>
    apiFetch<Event>('/api/events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Event>) =>
    apiFetch<Event>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<{ success: boolean }>(`/api/events/${id}`, { method: 'DELETE' }),
};

// ─── Challenges ───────────────────────────────────────────────────────────────

export const challenges = {
  list: (params?: { academyId?: string }) => {
    const qs = params?.academyId ? `?academyId=${encodeURIComponent(params.academyId)}` : '';
    return apiFetch<Challenge[]>(`/api/challenges${qs}`);
  },
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
  create: (data: Omit<Notification, 'id' | 'createdAt' | 'whatsapp'>) =>
    apiFetch<Notification>('/api/notifications', { method: 'POST', body: JSON.stringify(data) }),
  markRead: (id: string) =>
    apiFetch<Notification>(`/api/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ read: true }) }),
  markAllRead: () => apiFetch<{ updated: number }>('/api/notifications/read-all', { method: 'PATCH' }),
  clearAll: () => apiFetch<{ success: boolean }>('/api/notifications', { method: 'DELETE' }),
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

export interface FinancialSettings {
  autoSuspendAfterDays: number;
  defaultAutoSuspendAfterDays: number;
}

export interface PaymentIntegrationSettings {
  provider: 'asaas';
  manualPaymentsEnabled: boolean;
  asaasEnabled: boolean;
  asaasSandbox: boolean;
  asaasBillingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  hasAsaasApiKey: boolean;
  asaasApiKeyLast4: string | null;
  webhookToken: string;
  webhookUrl: string;
  pixKey?: string | null;
  pixQrCodeUrl?: string | null;
}
export const financialSettings = {
  get: () => apiFetch<FinancialSettings>('/api/settings/financial'),
  update: (data: { autoSuspendAfterDays: number }) =>
    apiFetch<FinancialSettings>('/api/settings/financial', { method: 'PUT', body: JSON.stringify(data) }),
};

export const settings = {
  public: () => apiFetch<Record<string, string>>('/api/settings/public'),
};

export const paymentIntegrations = {
  get: () => apiFetch<PaymentIntegrationSettings>('/api/settings/payment-integration'),
  update: (data: Partial<PaymentIntegrationSettings> & { asaasApiKey?: string; clearAsaasApiKey?: boolean }) =>
    apiFetch<PaymentIntegrationSettings>('/api/settings/payment-integration', { method: 'PUT', body: JSON.stringify(data) }),
  test: (data: { asaasApiKey?: string; asaasSandbox?: boolean }) =>
    apiFetch<{ success: boolean; sandbox: boolean }>('/api/settings/payment-integration/test', { method: 'POST', body: JSON.stringify(data) }),
};

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
  create: (data: Omit<AcademyRequest, 'id' | 'createdAt' | 'studentUid'> & { studentUid?: string }) =>
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

// ─── Competitions ──────────────────────────────────────────────────────────

export const competitions = {
  list: (uid?: string) =>
    apiFetch<Competition[]>(`/api/competitions${uid ? `?uid=${uid}` : ''}`),
  create: (data: Omit<Competition, 'id' | 'createdAt'>) =>
    apiFetch<Competition>('/api/competitions', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/competitions/${id}`, { method: 'DELETE' }),
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface WhatsAppAutomationResult {
  enabled: boolean;
  recipients: number;
  sent: number;
  failed: number;
}

export type AnnouncementWhatsAppResult = WhatsAppAutomationResult;

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
  sourceUid?: string | null;
  sourceName?: string | null;
  sourceRole?: string | null;
  scope?: 'global' | 'academy' | 'professor' | string | null;
  audience?: 'all' | 'students' | 'professors' | string | null;
  targetAcademyId?: string | null;
  targetProfessorUid?: string | null;
  urgent?: boolean | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  whatsapp?: WhatsAppAutomationResult;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  roleAssigned: string;
  features: string[];
  trialDays?: number | null;
  isActive?: boolean | null;
  createdAt?: string | null;
}

export interface Subscription {
  id: string;
  userUid: string;
  planId: string;
  status: string;
  asaasId?: string | null;
  asaasCustomerId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string | null;
  plan?: Plan | null;
}

export const subscriptions = {
  listPlans: () => apiFetch<Plan[]>('/api/subscriptions/plans'),
  getMy: () => apiFetch<{ subscription: Subscription | null }>('/api/subscriptions/my'),
  create: (data: { planId: string; billingType?: string; cpfCnpj?: string; phone?: string }) =>
    apiFetch<{ subscription: { id: string; asaasId: string; payment?: { id: string; invoiceUrl?: string; bankSlipUrl?: string; status: string } | null } }>('/api/subscriptions', {
      method: 'POST', body: JSON.stringify(data),
    }),
  cancel: () =>
    apiFetch<{ success: boolean }>('/api/subscriptions/cancel', { method: 'POST' }),
  getBilling: () =>
    apiFetch<{ billingType: string | null; availableMethods: string[]; pendingPayment?: { id: string; value: number; dueDate: string; status: string; invoiceUrl?: string; bankSlipUrl?: string; pixQrCode?: string } | null; graceDays?: number }>('/api/subscriptions/my/billing'),
  updateBilling: (billingType: string) =>
    apiFetch<{ billingType: string; availableMethods: string[]; message: string }>('/api/subscriptions/my/billing', {
      method: 'PUT', body: JSON.stringify({ billingType }),
    }),
};

// ─── Upload ───────────────────────────────────────────────────────────────────

export const upload = {
  file: async (file: File, category = 'geral'): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiFetch<{ url: string }>(`/api/upload?category=${encodeURIComponent(category)}`, {
      method: 'POST',
      body: form,
      headers: {} as Record<string, string>,
    });
    return res.url;
  },
};

// ─── Export padrão agrupado ───────────────────────────────────────────────────

// ─── Announcements (user-facing) ──────────────────────────────────────────────

export const announcementsApi = {
  list: () => apiFetch<Announcement[]>('/api/announcements'),
  mine: () => apiFetch<Announcement[]>('/api/announcements?mine=true'),
  create: (data: { title: string; content: string; imageUrl?: string; linkUrl?: string; linkText?: string; audience?: string; urgent?: boolean }) =>
    apiFetch<Announcement>('/api/announcements', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Announcement>) =>
    apiFetch<Announcement>(`/api/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/announcements/${id}`, { method: 'DELETE' }),
  dismiss: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/announcements/${id}/dismiss`, { method: 'POST' }),
};

// ─── Public (no auth required) ──────────────────────────────────────────────

export const publicApi = {
  searchProfessors: (search: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}&role=professor` : '?role=professor';
    return apiFetch<any[]>(`/api/public/professors${q}`);
  },
  searchAcademies: (search: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}&role=academy` : '?role=academy';
    return apiFetch<any[]>(`/api/public/professors${q}`);
  },
  trialTarget: (kind: 'academy' | 'professor', uid: string) =>
    apiFetch<{
      id: string;
      kind: 'academy' | 'professor';
      ownerUid: string;
      name: string;
      logo?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      phone?: string | null;
      trialRequestsEnabled?: boolean | null;
      schedules?: { day: string; time?: string; modality?: string }[];
    }>(`/api/public/trial/${kind}/${encodeURIComponent(uid)}`),
  createTrialRequest: (data: {
    targetKind: 'academy' | 'professor';
    targetUid: string;
    name: string;
    email?: string;
    phone: string;
    belt?: string;
    age?: string;
    message?: string;
    preferredDay?: string;
  }) =>
    apiFetch<{ success: boolean }>('/api/public/trial-requests', { method: 'POST', body: JSON.stringify(data) }),
  getPaymentMethods: (ownerUid: string) =>
    apiFetch<PaymentIntegrationSettings>(`/api/public/payment-methods/${encodeURIComponent(ownerUid)}`),
};

// Support
export const supportApi = {
  sendSuperadminEmail: (data: SuperadminEmailPayload) =>
    apiFetch<{ success: boolean; delivery?: { provider: string; sent: boolean; recipients: number } }>(
      '/api/support/superadmin-email',
      { method: 'POST', body: JSON.stringify(data) },
    ),
};

// WhatsApp

export interface WhatsAppStatus {
  connected: boolean;
  instance: {
    id: string;
    status: string;
    phone?: string | null;
  } | null;
  expired?: boolean;
  attemptTimeoutMs?: number;
}

export interface WhatsAppConnectResponse {
  qrcode?: string | null;
  qrCodeText?: string | null;
  expired?: boolean;
  attemptTimeoutMs?: number;
}

export const whatsapp = {
  status: () => apiFetch<WhatsAppStatus>('/api/whatsapp/status'),
  connect: () => apiFetch<WhatsAppConnectResponse>('/api/whatsapp/connect', { method: 'POST' }),
  disconnect: () => apiFetch<{ success: boolean }>('/api/whatsapp/disconnect', { method: 'POST' }),
  send: (phone: string, message: string) =>
    apiFetch<{ success: boolean; messageId: string }>('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    }),
};

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
  settings,
  financialSettings,
  paymentIntegrations,
  enrollments,
  academyRequests,
  subscriptions,
  classes,
  promotions,
  achievements,
  competitions,
  upload,
  admin,
  academy,
  announcements: announcementsApi,
  public: publicApi,
  support: supportApi,
  whatsapp,
};

export default api;
