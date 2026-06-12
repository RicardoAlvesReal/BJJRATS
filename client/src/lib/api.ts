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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  const res = await fetch(`${BASE}${urlPath}`, { ...options, headers, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || res.statusText) as any;
    err.status = res.status;
    err.code = body.error;
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

  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => apiFetch<UserProfile>('/api/auth/me'),

  resetPassword: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUser extends UserProfile {
  role: string;
  communityModerator?: boolean;
  trialEndsAt?: string | null;
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

  getStats: (days?: number) => apiFetch<AdminStats>(`/api/admin/stats${days ? `?days=${days}` : ''}`),

  getCrmData: () => apiFetch<CrmData>('/api/admin/crm'),

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
    const q = search ? `?search=${encodeURIComponent(search)}&role=admin` : '?role=admin';
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
};

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

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
  enrollments,
  academyRequests,
  subscriptions,
  classes,
  promotions,
  achievements,
  competitions,
  upload,
  admin,
  announcements: announcementsApi,
  public: publicApi,
  whatsapp,
};

export default api;
