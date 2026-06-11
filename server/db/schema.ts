import {
  pgTable, text, integer, boolean, timestamp, real, jsonb, uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── users ──────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  uid:              text('uid').primaryKey(),           // nanoid gerado pelo servidor
  name:             text('name').notNull(),
  email:            text('email').notNull().unique(),
  passwordHash:     text('password_hash').notNull(),
  subscriptionExempt: boolean('subscription_exempt').default(false),
  photo:            text('photo'),
  belt:             text('belt').notNull().default('Branca'),
  stripes:          integer('stripes').default(0),
  academy:          text('academy').default(''),
  academyId:        text('academy_id'),
  professor:        text('professor').default(''),
  dob:              text('dob'),
  sex:              text('sex'),
  weightKg:         text('weight_kg'),
  heightCm:         text('height_cm'),
  phone:            text('phone'),
  address:          text('address'),
  bjjSince:         text('bjj_since'),
  xp:               integer('xp').default(0),
  totalTrainings:   integer('total_trainings').default(0),
  totalMinutes:     integer('total_minutes').default(0),
  streak:           integer('streak').default(0),
  lastTrainingDate: text('last_training_date'),
  athleteType:      text('athlete_type'),
  isAcademyAdmin:   boolean('is_academy_admin').default(false),
  role:             text('role').default('student'),   // 'superadmin' | 'admin' | 'professor' | 'student'
  communityModerator: boolean('community_moderator').default(false),
  trialEndsAt: timestamp('trial_ends_at'),
  trialRequestsEnabled: boolean('trial_requests_enabled').default(true),
  academyName:      text('academy_name'),
  academyAddress:   text('academy_address'),
  academyCity:      text('academy_city'),
  academyState:     text('academy_state'),
  academyLatitude:  real('academy_latitude'),
  academyLongitude: real('academy_longitude'),
  academyLogoUrl:   text('academy_logo_url'),
  academyCnpj:      text('academy_cnpj'),
  academyCep:       text('academy_cep'),
  academyNumber:    text('academy_number'),
  academyNeighborhood:text('academy_neighborhood'),
  academyComplement:text('academy_complement'),
  professorPhotoUrl:text('professor_photo_url'),
  savedAcademies:   jsonb('saved_academies').default([]),
  savedProfessors:  jsonb('saved_professors').default([]),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ─── plans ─────────────────────────────────────────────────────────────────
export const plans = pgTable('plans', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull(),
  slug:         text('slug').notNull().unique(),
  description:  text('description'),
  price:        real('price').notNull(),
  roleAssigned: text('role_assigned').notNull(),       // admin|professor|student
  features:     jsonb('features').default([]),
  trialDays:    integer('trial_days').default(0),
  isActive:     boolean('is_active').default(true),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ─── subscriptions ─────────────────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id:                 text('id').primaryKey(),
  userUid:            text('user_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  planId:             text('plan_id').notNull().references(() => plans.id, { onDelete: 'restrict' }),
  status:             text('status').default('active'),  // active|trial|cancelled|past_due|expired
  asaasId:            text('asaas_id'),
  asaasCustomerId:    text('asaas_customer_id'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd:   timestamp('current_period_end'),
  trialEndsAt:        timestamp('trial_ends_at'),
  cancelledAt:        timestamp('cancelled_at'),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ─── settings ───────────────────────────────────────────────────────────────
export const settings = pgTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
});

// ─── trainings ──────────────────────────────────────────────────────────────
export const trainings = pgTable('trainings', {
  id:             text('id').primaryKey(),
  uid:            text('uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  trainingDate:   text('training_date').notNull(),
  sessionType:    text('session_type'),
  modality:       text('modality'),
  duration:       integer('duration').notNull(),
  intensity:      integer('intensity'),
  satisfaction:   integer('satisfaction'),
  techniques:     jsonb('techniques').default({}),
  notes:          text('notes'),
  academy:        text('academy'),
  professor:      text('professor'),
  trainingPhotoUrl: text('training_photo_url'),
  xp:             integer('xp').default(0),
  extraData:      jsonb('extra_data'),
  compData:       jsonb('comp_data'),
  createdAt:      timestamp('created_at').defaultNow(),
});

// ─── extra_trainings ─────────────────────────────────────────────────────────
export const extraTrainings = pgTable('extra_trainings', {
  id:           text('id').primaryKey(),
  uid:          text('uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  trainingDate: text('training_date').notNull(),
  activity:     text('activity'),
  duration:     integer('duration').notNull(),
  notes:        text('notes'),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ─── goals ───────────────────────────────────────────────────────────────────
export const goals = pgTable('goals', {
  id:          text('id').primaryKey(),
  uid:         text('uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  target:      integer('target').default(0),
  unit:        text('unit').default('treinos'),
  period:      text('period').default('weekly'),      // 'weekly' | 'monthly'
  isActive:    boolean('is_active').default(true),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ─── posts ───────────────────────────────────────────────────────────────────
export const posts = pgTable('posts', {
  id:           text('id').primaryKey(),
  authorUid:    text('author_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  authorName:   text('author_name'),
  authorPhoto:  text('author_photo'),
  authorBelt:   text('author_belt'),
  content:      text('content'),
  mediaUrl:     text('media_url'),
  mediaType:    text('media_type'),                   // 'image' | 'video'
  postType:     text('post_type').default('community'),// 'community' | 'academy' | 'training'
  academyId:    text('academy_id'),
  trainingData: jsonb('training_data'),
  likes:        jsonb('likes').default([]),           // array of uid strings
  createdAt:    timestamp('created_at').defaultNow(),
});

// ─── comments ────────────────────────────────────────────────────────────────
export const comments = pgTable('comments', {
  id:          text('id').primaryKey(),
  postId:      text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorUid:   text('author_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  authorName:  text('author_name'),
  authorPhoto: text('author_photo'),
  content:     text('content').notNull(),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ─── events ──────────────────────────────────────────────────────────────────
export const events = pgTable('events', {
  id:          text('id').primaryKey(),
  creatorUid:  text('creator_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  academyId:   text('academy_id'),
  title:       text('title').notNull(),
  description: text('description'),
  eventDate:   text('event_date'),
  eventTime:   text('event_time'),
  location:    text('location'),
  mediaUrl:    text('media_url'),
  isPublic:    boolean('is_public').default(true),
  rsvps:       jsonb('rsvps').default([]),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ─── challenges ──────────────────────────────────────────────────────────────
export const challenges = pgTable('challenges', {
  id:          text('id').primaryKey(),
  creatorUid:  text('creator_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  academyId:   text('academy_id'),
  title:       text('title').notNull(),
  description: text('description'),
  target:      integer('target').default(1),
  unit:        text('unit').default('treinos'),
  startDate:   text('start_date'),
  endDate:     text('end_date'),
  mediaUrl:    text('media_url'),
  isPublic:    boolean('is_public').default(true),
  participants:jsonb('participants').default([]),      // [{uid, progress}]
  createdAt:   timestamp('created_at').defaultNow(),
});

// ─── notifications ───────────────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id:        text('id').primaryKey(),
  toUid:     text('to_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  fromUid:   text('from_uid'),
  fromName:  text('from_name'),
  type:      text('type'),                            // 'payment', 'enrollment', 'promotion', etc
  message:   text('message').notNull(),
  data:      jsonb('data'),
  read:      boolean('read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── payments ────────────────────────────────────────────────────────────────
export const payments = pgTable('payments', {
  id:           text('id').primaryKey(),
  professorUid: text('professor_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  studentUid:   text('student_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  studentName:  text('student_name'),
  studentEmail: text('student_email'),
  amount:       real('amount').notNull(),
  dueDate:      timestamp('due_date'),
  paidAt:       timestamp('paid_at'),
  status:       text('status').default('pending'),    // 'pending'|'paid'|'overdue'|'suspended'
  pixLink:      text('pix_link'),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ─── enrollments ─────────────────────────────────────────────────────────────
export const enrollments = pgTable('enrollments', {
  id:            text('id').primaryKey(),
  professorUid:  text('professor_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  professorName: text('professor_name'),
  academyName:   text('academy_name'),
  studentUid:    text('student_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  studentName:   text('student_name'),
  monthlyFee:    real('monthly_fee').default(0),
  dueDay:        integer('due_day').default(1),
  status:        text('status').default('active'),    // 'active'|'suspended'|'cancelled'
  pixKey:        text('pix_key'),
  createdAt:     timestamp('created_at').defaultNow(),
});

// ─── academy_requests ────────────────────────────────────────────────────────
export const academyRequests = pgTable('academy_requests', {
  id:             text('id').primaryKey(),
  studentUid:     text('student_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  studentName:    text('student_name'),
  studentEmail:   text('student_email'),
  studentPhoto:   text('student_photo'),
  studentBelt:    text('student_belt'),
  professorUid:   text('professor_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  academyName:    text('academy_name'),
  status:         text('status').default('pending'),  // 'pending'|'accepted'|'rejected'
  createdAt:      timestamp('created_at').defaultNow(),
});

// ─── class_schedules ─────────────────────────────────────────────────────────
export const classSchedules = pgTable('class_schedules', {
  id:          text('id').primaryKey(),
  academyId:   text('academy_id').notNull(),
  professorUid:text('professor_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  dayOfWeek:   integer('day_of_week'),               // 0=dom..6=sab
  startTime:   text('start_time'),
  endTime:     text('end_time'),
  className:   text('class_name'),
  modality:    text('modality'),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ─── class_check_ins ─────────────────────────────────────────────────────────
export const classCheckIns = pgTable('class_check_ins', {
  id:          text('id').primaryKey(),
  scheduleId:  text('schedule_id').references(() => classSchedules.id, { onDelete: 'set null' }),
  academyId:   text('academy_id').notNull(),
  studentUid:  text('student_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  checkInDate: text('check_in_date'),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ─── promotions ──────────────────────────────────────────────────────────────
export const promotions = pgTable('promotions', {
  id:           text('id').primaryKey(),
  professorUid: text('professor_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  studentUid:   text('student_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  studentName:  text('student_name'),
  fromBelt:     text('from_belt'),
  toBelt:       text('to_belt'),
  fromStripes:  integer('from_stripes'),
  toStripes:    integer('to_stripes'),
  notes:        text('notes'),
  promotedAt:   timestamp('promoted_at').defaultNow(),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ─── user_achievements ───────────────────────────────────────────────────────
export const userAchievements = pgTable('user_achievements', {
  id:            text('id').primaryKey(),
  uid:           text('uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull(),
  unlockedAt:    timestamp('unlocked_at').defaultNow(),
});

// ─── competitions ──────────────────────────────────────────────────────────
export const competitions = pgTable('competitions', {
  id:          text('id').primaryKey(),
  uid:         text('uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  date:        text('date'),
  location:    text('location'),
  category:    text('category'),
  weightClass: text('weight_class'),
  result:      text('result').default('gold'),
  notes:       text('notes'),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ─── announcements ────────────────────────────────────────────────────────────
export const announcements = pgTable('announcements', {
  id:        text('id').primaryKey(),
  title:     text('title').notNull(),
  content:   text('content').notNull(),       // texto simples (pode conter HTML)
  imageUrl:  text('image_url'),
  linkUrl:   text('link_url'),
  linkText:  text('link_text'),
  sourceUid: text('source_uid'),
  sourceName:text('source_name'),
  sourceRole:text('source_role'),
  scope:     text('scope').default('global'), // global|academy|professor
  audience:  text('audience').default('all'), // all|students|professors
  targetAcademyId: text('target_academy_id'),
  targetProfessorUid: text('target_professor_uid'),
  urgent:    boolean('urgent').default(false),
  isActive:  boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── announcement_dismissals ──────────────────────────────────────────────────
export const announcementDismissals = pgTable('announcement_dismissals', {
  id:             text('id').primaryKey(),
  announcementId: text('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userUid:        text('user_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  dismissedAt:    timestamp('dismissed_at').defaultNow(),
}, (table) => [
  uniqueIndex('idx_announcement_dismissal').on(table.announcementId, table.userUid),
]);

// ─── whatsapp_instances ──────────────────────────────────────────────────────
export const whatsappInstances = pgTable('whatsapp_instances', {
  id:            text('id').primaryKey(),
  professorUid:  text('professor_uid').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  instanceName:  text('instance_name').notNull(),
  status:        text('status').default('disconnected'), // 'connected'|'disconnected'|'connecting'
  phone:         text('phone'),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
}, (table) => [
  uniqueIndex('idx_whatsapp_professor').on(table.professorUid),
]);
