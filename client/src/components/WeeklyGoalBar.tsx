// BJJRats PWA — WeeklyGoalBar Component
// Barra de progresso semanal: treinos concluídos vs meta definida
// Design: Cage Fighter — vermelho/escuro, Barlow Condensed, animação CSS

import { useEffect, useState } from 'react';

interface Props {
  current: number;       // treinos feitos nesta semana
  target: number;        // meta semanal definida pelo usuário
  onEditGoal?: () => void; // callback para ir à tela de metas
}

export default function WeeklyGoalBar({ current, target, onEditGoal }: Props) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const achieved = current >= target && target > 0;
  const remaining = Math.max(target - current, 0);

  // Anima a barra ao montar ou quando os valores mudam
  useEffect(() => {
    const t = setTimeout(() => setAnimatedWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  // Dias restantes na semana (domingo = 0)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = domingo
  const daysLeft = 6 - dayOfWeek;  // dias restantes até sábado

  const barColor = achieved
    ? '#22C55E'  // verde — meta atingida
    : pct >= 75
    ? '#EAB308'  // amarelo — quase lá
    : '#CC0000'; // vermelho — em andamento

  return (
    <div
      style={{
        background: achieved ? 'rgba(34,197,94,0.06)' : '#111',
        border: `1px solid ${achieved ? 'rgba(34,197,94,0.25)' : '#1E1E1E'}`,
        borderRadius: '6px',
        padding: '16px 20px',
        marginBottom: '12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Brilho de fundo quando meta atingida */}
      {achieved && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Linha superior: label + contador */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1rem' }}>{achieved ? '🏆' : '🎯'}</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: achieved ? '#22C55E' : '#AAA',
          }}>
            {achieved ? 'META SEMANAL ATINGIDA!' : 'META DA SEMANA'}
          </span>
        </div>

        {/* Contador treinos / meta */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '1.6rem',
            color: barColor,
            lineHeight: 1,
          }}>
            {current}
          </span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 400,
            fontSize: '0.85rem',
            color: '#444',
          }}>
            /{target}
          </span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 400,
            fontSize: '0.7rem',
            color: '#333',
            marginLeft: '2px',
            textTransform: 'uppercase',
          }}>
            treinos
          </span>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{
        height: '8px',
        background: '#1A1A1A',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '10px',
      }}>
        <div style={{
          height: '100%',
          width: `${animatedWidth}%`,
          background: achieved
            ? 'linear-gradient(90deg, #16A34A, #22C55E)'
            : `linear-gradient(90deg, ${barColor}CC, ${barColor})`,
          borderRadius: '4px',
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: achieved ? `0 0 8px rgba(34,197,94,0.5)` : `0 0 6px ${barColor}66`,
        }} />
      </div>

      {/* Linha inferior: status + ação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#444',
        }}>
          {achieved
            ? `✓ Parabéns! ${daysLeft > 0 ? `Ainda ${daysLeft} dia${daysLeft > 1 ? 's' : ''} para superar` : 'Semana concluída!'}`
            : remaining === 1
            ? `Falta 1 treino para atingir a meta`
            : remaining > 1
            ? `Faltam ${remaining} treinos · ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`
            : 'Defina sua meta na aba Metas'
          }
        </span>

        {onEditGoal && (
          <button
            onClick={onEditGoal}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#333',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '0.68rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              padding: '2px 0',
            }}
          >
            EDITAR META →
          </button>
        )}
      </div>

      {/* Marcadores de progresso (bolinhas) */}
      {target > 0 && target <= 7 && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          {Array.from({ length: target }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: i < current
                  ? barColor
                  : '#1E1E1E',
                transition: `background 0.3s ease ${i * 0.08}s`,
                boxShadow: i < current && achieved ? `0 0 4px ${barColor}88` : 'none',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
