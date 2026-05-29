export interface FeatureDef {
  key: string;
  label: string;
  description: string;
}

export const ALL_FEATURES: FeatureDef[] = [
  { key: 'training_tracking', label: 'Registro de treinos', description: 'Registra treinos com duração, intensidade, técnicas e notas pessoais' },
  { key: 'training_history', label: 'Histórico completo', description: 'Acesso ao histórico completo de todos os treinos registrados' },
  { key: 'streak', label: 'Sequência (streak)', description: 'Acompanha dias consecutivos de treino para manter a motivação' },
  { key: 'community', label: 'Comunidade', description: 'Acesso ao feed da comunidade com posts, eventos e desafios' },
  { key: 'achievements', label: 'Conquistas', description: 'Sistema de conquistas e medalhas por metas atingidas' },
  { key: 'competitions', label: 'Competições', description: 'Registro e acompanhamento de competições de Jiu-Jitsu' },
  { key: 'goals', label: 'Metas', description: 'Define e acompanha metas pessoais de treino' },
  { key: 'challenges', label: 'Desafios', description: 'Cria e participa de desafios com outros alunos' },
  { key: 'events', label: 'Eventos', description: 'Visualiza e participa de eventos da comunidade' },
  { key: 'profile_stats', label: 'Estatísticas do perfil', description: 'Estatísticas detalhadas exibidas no perfil público' },
  { key: 'professor_panel', label: 'Painel do professor', description: 'Painel exclusivo com ferramentas de gestão de alunos' },
  { key: 'student_management', label: 'Gestão de alunos', description: 'Gerencia alunos: matrículas, pagamentos e evolução' },
  { key: 'unlimited_students', label: 'Alunos ilimitados', description: 'Sem limite de alunos cadastrados no sistema' },
  { key: 'enrollments', label: 'Matrículas', description: 'Sistema de matrículas com controle de mensalidades' },
  { key: 'payments', label: 'Pagamentos', description: 'Gestão de pagamentos e cobranças dos alunos' },
  { key: 'promotions', label: 'Promoções de faixa', description: 'Registro e histórico de promoções de faixa dos alunos' },
  { key: 'class_schedules', label: 'Agenda de aulas', description: 'Cria e gerencia horários de aulas da academia' },
  { key: 'class_checkins', label: 'Chamada (check-in)', description: 'Registro de presença dos alunos nas aulas' },
  { key: 'training_analytics', label: 'Analytics de treinos', description: 'Relatórios e gráficos de desempenho dos treinos' },
  { key: 'exclusive_student_attention', label: 'Atendimento exclusivo', description: 'Suporte prioritário e canal direto com a equipe' },
  { key: 'admin_dashboard', label: 'Dashboard administrativo', description: 'Visão geral da academia com indicadores principais' },
  { key: 'user_management', label: 'Gestão de usuários', description: 'Administra usuários, perfis e permissões' },
  { key: 'crm', label: 'CRM completo', description: 'Gestão de relacionamento com alunos e leads' },
  { key: 'multiple_professors', label: 'Múltiplos professores', description: 'Permite cadastrar e gerenciar vários professores na academia' },
  { key: 'reports', label: 'Relatórios', description: 'Relatórios detalhados de treinos, alunos e financeiro' },
  { key: 'revenue_analytics', label: 'Analytics financeiro', description: 'Acompanhamento de receitas, inadimplência e projeções' },
];

export const FEATURE_LABELS: { key: string; label: string }[] = ALL_FEATURES.map(f => ({ key: f.key, label: f.label }));
