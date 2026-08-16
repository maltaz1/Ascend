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
 <Modal open={open} onClose={onClose} title="Ajustar Metas de Dieta"><div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: '100%' }}>
 {/* Calorie Goal Section */}
 <div className="ledger-paper ledger-paper--amber" style={{ padding: '16px' }}>
 <div className="ledger-marginalia mb-2">Meta Calórica Diária</div><input
 className="ledger-input"
 type="number"
 value={dietSettings.dailyCalorieGoal}
 onChange={(e) => onSettingsChange({ ...dietSettings, dailyCalorieGoal: parseInt(e.target.value) })}
 style={{ width: '100%' }}
 /><div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'DM Sans', marginTop: 8 }}>
 Recomendação: 1800-2500 kcal/dia
 </div></div>

 {/* Macronutrients Section */}
 <div><div className="ledger-marginalia mb-2">Macronutrientes</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
 {/* Protein */}
 <div style={{ background: 'var(--ledger-paper-bg)', border: '1px solid var(--ledger-paper-border)', borderRadius: 6, padding: '12px' }}>
 <div className="ledger-marginalia mb-2">Proteína</div><input
 className="ledger-input"
 type="number"
 value={dietSettings.proteinGoal}
 onChange={(e) => onSettingsChange({ ...dietSettings, proteinGoal: parseInt(e.target.value) })}
 style={{ width: '100%' }}
 /><div style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'DM Sans', marginTop: 6 }}>
 gramas
 </div></div>

 {/* Carbs */}
 <div style={{ background: 'var(--ledger-paper-bg)', border: '1px solid var(--ledger-paper-border)', borderRadius: 6, padding: '12px' }}>
 <div className="ledger-marginalia mb-2">Carboidratos</div><input
 className="ledger-input"
 type="number"
 value={dietSettings.carbsGoal}
 onChange={(e) => onSettingsChange({ ...dietSettings, carbsGoal: parseInt(e.target.value) })}
 style={{ width: '100%' }}
 /><div style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'DM Sans', marginTop: 6 }}>
 gramas
 </div></div>

 {/* Fat */}
 <div style={{ background: 'var(--ledger-paper-bg)', border: '1px solid var(--ledger-paper-border)', borderRadius: 6, padding: '12px' }}>
 <div className="ledger-marginalia mb-2">Gordura</div><input
 className="ledger-input"
 type="number"
 value={dietSettings.fatGoal}
 onChange={(e) => onSettingsChange({ ...dietSettings, fatGoal: parseInt(e.target.value) })}
 style={{ width: '100%' }}
 /><div style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'DM Sans', marginTop: 6 }}>
 gramas
 </div></div></div></div>

 {/* Hydration Section */}
 <div className="ledger-paper" style={{ padding: '16px', borderTopColor: 'var(--primary)' }}>
 <div className="ledger-marginalia mb-2">Meta de Hidratação</div><input
 className="ledger-input"
 type="number"
 step="100"
 value={dietSettings.waterGoal}
 onChange={(e) => onSettingsChange({ ...dietSettings, waterGoal: parseInt(e.target.value) })}
 style={{ width: '100%' }}
 /><div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'DM Sans', marginTop: 8 }}>
 Recomendação: 2000-3000 mL/dia (2-3 litros)
 </div></div>

 {/* Save Button */}
 <button className="ledger-btn ledger-btn--amber" onClick={onSave} style={{ width: '100%' }}>
 Salvar Metas
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
 `}</style></div></Modal>
 );
}
