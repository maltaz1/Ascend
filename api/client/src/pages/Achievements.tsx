// FlowZone Achievements — Carbon Amber Industrial Premium
// Sistema de conquistas/badges com desbloqueio progressivo

import { useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { getLevelProgress } from '@/lib/store';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Trophy, Zap, Star, Lock } from 'lucide-react';

const ACHIEVEMENT_BADGE_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663572413338/HobM3k6R2A7cASuPN7gfoC/achievement-badge-mbbN3F9d3UneZfJaU6EM8X.webp';

export default function Achievements() {
  const data = useStore();
  const levelProgress = getLevelProgress();

  const unlocked = data.achievements.filter(a => a.unlockedAt);
  const locked = data.achievements.filter(a => !a.unlockedAt);
  const totalXP = useMemo(() => {
    let total = data.user.xp;
    for (let l = 1; l < data.user.level; l++) total += l * 100;
    return total;
  }, [data.user.xp, data.user.level]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 28, color: 'var(--foreground)', marginBottom: 4 }}>
          Conquistas
        </h1>
        <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--muted-foreground)' }}>
          {unlocked.length}/{data.achievements.length} desbloqueadas
        </p>
      </div>

      {/* Profile Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(168,85,247,0.08))',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 28,
      }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F59E0B, #A855F7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontFamily: 'Space Grotesk',
            fontWeight: 800,
            color: 'white',
            boxShadow: '0 0 30px rgba(245,158,11,0.3)',
          }}>
            {data.user.name.charAt(0).toUpperCase()}
          </div>
          <div className="level-badge" style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            fontSize: 12,
            padding: '3px 8px',
          }}>
            Nv {data.user.level}
          </div>
        </div>

        {/* Stats */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 22, color: 'var(--foreground)', marginBottom: 4 }}>
            {data.user.name}
          </h2>
          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            {[
              { label: 'XP Total', value: totalXP, color: '#F59E0B', icon: '⚡' },
              { label: 'Streak', value: `${data.user.streak}d`, color: '#EF4444', icon: '🔥' },
              { label: 'Tarefas', value: data.user.totalTasksCompleted, color: '#10B981', icon: '✅' },
              { label: 'Metas', value: data.user.totalGoalsCompleted, color: '#A855F7', icon: '🎯' },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 20, color: stat.color }}>
                  {stat.icon} {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
                </div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--muted-foreground)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--muted-foreground)' }}>
                Progresso para Nível {data.user.level + 1}
              </span>
              <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 12, color: '#F59E0B' }}>
                {levelProgress.current}/{levelProgress.max} XP
              </span>
            </div>
            <div className="fz-progress-bar" style={{ height: 8 }}>
              <div className="fz-progress-fill" style={{ width: `${levelProgress.percent}%` }} />
            </div>
          </div>
        </div>

        {/* Trophy image */}
        <div style={{ flexShrink: 0 }}>
          <img src={ACHIEVEMENT_BADGE_URL} alt="Trophy" style={{ width: 80, height: 80, objectFit: 'contain', filter: unlocked.length > 0 ? 'none' : 'grayscale(1) opacity(0.3)' }} />
        </div>
      </div>

      {/* Unlocked Achievements */}
      {unlocked.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Trophy size={16} color="#F59E0B" />
            <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 17, color: 'var(--foreground)' }}>
              Desbloqueadas
            </h2>
            <span className="fz-badge fz-badge-amber">{unlocked.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {unlocked.map(achievement => (
              <div key={achievement.id} className="achievement-card unlocked" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Glow */}
                <div style={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'rgba(245,158,11,0.15)',
                  filter: 'blur(15px)',
                }} />
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))',
                  border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}>
                  {achievement.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 14, color: 'var(--foreground)', marginBottom: 2 }}>
                    {achievement.title}
                  </div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--muted-foreground)' }}>
                    {achievement.description}
                  </div>
                  {achievement.unlockedAt && (
                    <div style={{ fontSize: 10, color: '#F59E0B', fontFamily: 'DM Sans', marginTop: 4 }}>
                      🏆 {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {locked.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Lock size={16} color="var(--muted-foreground)" />
            <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 17, color: 'var(--muted-foreground)' }}>
              Bloqueadas
            </h2>
            <span className="fz-badge" style={{ background: 'var(--border)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
              {locked.length}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {locked.map(achievement => (
              <div key={achievement.id} className="achievement-card locked">
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--border)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                  filter: 'grayscale(1)',
                }}>
                  {achievement.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 2 }}>
                    {achievement.title}
                  </div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--muted-foreground)' }}>
                    {achievement.description}
                  </div>
                </div>
                <Lock size={14} color="var(--muted-foreground)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.achievements.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
          <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20, color: 'var(--muted-foreground)' }}>
            Complete tarefas e metas para desbloquear conquistas!
          </h3>
        </div>
      )}
    </div>
  );
}
