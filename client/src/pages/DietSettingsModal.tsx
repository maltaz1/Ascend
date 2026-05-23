// Modal de Configurações de Dieta - UI/UX Melhorada
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import type { DietSettings } from '@/lib/store';

interface DietSettingsModalProps {
  open: boolean;
  onClose: () => void;
  dietSettings: DietSettings;
  onSettingsChange: (settings: DietSettings) => void;
  onSave: () => void;
}

export function DietSettingsModal({
  open,
  onClose,
  dietSettings,
  onSettingsChange,
  onSave,
}: DietSettingsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="⚙️ Ajustar Metas de Dieta">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: '100%' }}>
        {/* Calorie Goal Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.05) 100%)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 12,
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <label style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: '#F59E0B', margin: 0 }}>
              Meta Calórica Diária
            </label>
          </div>
          <input
            className="fz-input"
            type="number"
            value={dietSettings.dailyCalorieGoal}
            onChange={(e) => onSettingsChange({ ...dietSettings, dailyCalorieGoal: parseInt(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans', marginTop: 8 }}>
            Recomendação: 1800-2500 kcal/dia
          </div>
        </div>

        {/* Macronutrients Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>💪</span>
            <label style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: '#10B981', margin: 0 }}>
              Macronutrientes
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {/* Protein */}
            <div
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 10,
                padding: '12px',
              }}
            >
              <label style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Proteína
              </label>
              <input
                className="fz-input"
                type="number"
                value={dietSettings.proteinGoal}
                onChange={(e) => onSettingsChange({ ...dietSettings, proteinGoal: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 10, color: 'rgba(16,185,129,0.6)', fontFamily: 'DM Sans', marginTop: 6 }}>
                gramas
              </div>
            </div>

            {/* Carbs */}
            <div
              style={{
                background: 'rgba(59,182,246,0.08)',
                border: '1px solid rgba(59,182,246,0.2)',
                borderRadius: 10,
                padding: '12px',
              }}
            >
              <label style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Carboidratos
              </label>
              <input
                className="fz-input"
                type="number"
                value={dietSettings.carbsGoal}
                onChange={(e) => onSettingsChange({ ...dietSettings, carbsGoal: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 10, color: 'rgba(59,182,246,0.6)', fontFamily: 'DM Sans', marginTop: 6 }}>
                gramas
              </div>
            </div>

            {/* Fat */}
            <div
              style={{
                background: 'rgba(236,72,153,0.08)',
                border: '1px solid rgba(236,72,153,0.2)',
                borderRadius: 10,
                padding: '12px',
              }}
            >
              <label style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Gordura
              </label>
              <input
                className="fz-input"
                type="number"
                value={dietSettings.fatGoal}
                onChange={(e) => onSettingsChange({ ...dietSettings, fatGoal: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 10, color: 'rgba(236,72,153,0.6)', fontFamily: 'DM Sans', marginTop: 6 }}>
                gramas
              </div>
            </div>
          </div>
        </div>

        {/* Hydration Section */}
        <div
          style={{
            background: 'rgba(59,182,246,0.1)',
            border: '1px solid rgba(59,182,246,0.2)',
            borderRadius: 12,
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>💧</span>
            <label style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: '#3B82F6', margin: 0 }}>
              Meta de Hidratação
            </label>
          </div>
          <input
            className="fz-input"
            type="number"
            step="0.5"
            value={dietSettings.waterGoal}
            onChange={(e) => onSettingsChange({ ...dietSettings, waterGoal: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans', marginTop: 8 }}>
            Recomendação: 2-3 litros/dia
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={onSave}
          style={{
            padding: '14px 20px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            border: 'none',
            color: '#000',
            cursor: 'pointer',
            fontFamily: 'Space Grotesk',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
            width: '100%',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(245,158,11,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245,158,11,0.3)';
          }}
        >
          💾 Salvar Metas
        </button>

        {/* Responsive Styles */}
        <style>{`
          @media (max-width: 768px) {
            div[style*="gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))'"] {
              grid-template-columns: 1fr 1fr !important;
            }
          }
          @media (max-width: 480px) {
            div[style*="gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))'"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </Modal>
  );
}
