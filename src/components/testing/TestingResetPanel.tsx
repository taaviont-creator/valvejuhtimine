import React, { useState } from 'react';
import { ClassroomExercise, Simulation } from '../../models';

type PendingAction = 'new' | 'reset-current' | 'reset-selected-group' | 'reset-all-groups' | null;

interface Props {
  simulation: Simulation;
  classroomExercise: ClassroomExercise | null;
  onCreateCleanSimulation: () => void;
  onResetSimulation: () => void;
  onResetSelectedGroup: () => void;
  onResetAllGroups: () => void;
}

export const TestingResetPanel: React.FC<Props> = ({
  simulation,
  classroomExercise,
  onCreateCleanSimulation,
  onResetSimulation,
  onResetSelectedGroup,
  onResetAllGroups,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const confirmText =
    pendingAction === 'new'
      ? 'Kas oled kindel? See loob uue puhta simulatsiooni uute koodidega.'
      : pendingAction === 'reset-current'
      ? 'Kas oled kindel? See eemaldab aktiivsed sündmused, logi ja taastab ametnike algseisu.'
      : pendingAction === 'reset-selected-group'
      ? `Kas oled kindel? See lähtestab ainult grupi tööseisu: ${simulation.classroomGroupName ?? 'valitud grupp'}.`
      : pendingAction === 'reset-all-groups'
      ? 'Kas oled kindel? See lähtestab kõigi gruppide tööseisu.'
      : '';

  const runPendingAction = () => {
    if (pendingAction === 'new') onCreateCleanSimulation();
    if (pendingAction === 'reset-current') onResetSimulation();
    if (pendingAction === 'reset-selected-group') onResetSelectedGroup();
    if (pendingAction === 'reset-all-groups') onResetAllGroups();
    setPendingAction(null);
  };

  return (
    <section style={panelStyle}>
      <button onClick={() => setCollapsed((value) => !value)} style={headerButtonStyle}>
        <span>Testimine ja lähtestamine</span>
        <span>{collapsed ? '+' : '-'}</span>
      </button>

      {!collapsed && (
        <div style={bodyStyle}>
          <div style={noteStyle}>
            Kasuta neid nuppe uue testiringi alustamiseks. Lähtestamine hoiab liitumiskoodid alles, uus simulatsioon loob uued koodid.
          </div>

          <div style={buttonRowStyle}>
            <button style={secondaryButtonStyle} onClick={() => setPendingAction('new')}>
              Loo uus puhas simulatsioon
            </button>
            {classroomExercise ? (
              <>
                <button style={dangerButtonStyle} onClick={() => setPendingAction('reset-selected-group')}>
                  Lähtesta valitud grupp
                </button>
                <button style={dangerButtonStyle} onClick={() => setPendingAction('reset-all-groups')}>
                  Lähtesta kõik grupid
                </button>
              </>
            ) : (
              <button style={dangerButtonStyle} onClick={() => setPendingAction('reset-current')}>
                Lähtesta praegune simulatsioon
              </button>
            )}
          </div>

          {pendingAction && (
            <div style={confirmBoxStyle}>
              <div>{confirmText}</div>
              <div style={confirmButtonRowStyle}>
                <button style={confirmButtonStyle} onClick={runPendingAction}>
                  Kinnita lähtestamine
                </button>
                <button style={cancelButtonStyle} onClick={() => setPendingAction(null)}>
                  Tühista
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const panelStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderBottom: '1px solid var(--border-bright)',
  flexShrink: 0,
};

const headerButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 32,
  padding: '7px 14px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#eef4fa',
  border: 'none',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
  fontWeight: 800,
};

const bodyStyle: React.CSSProperties = {
  padding: '9px 12px 11px',
  display: 'grid',
  gap: 8,
};

const noteStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 11,
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'rgba(34,121,157,0.09)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  padding: '5px 8px',
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'transparent',
  border: '1px solid rgba(185,67,77,0.35)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--red)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  padding: '5px 8px',
};

const confirmBoxStyle: React.CSSProperties = {
  padding: 9,
  border: '1px solid rgba(185,67,77,0.35)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(185,67,77,0.08)',
  color: 'var(--text-primary)',
  fontSize: 12,
};

const confirmButtonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 7,
  flexWrap: 'wrap',
  marginTop: 8,
};

const confirmButtonStyle: React.CSSProperties = {
  ...dangerButtonStyle,
  background: 'rgba(185,67,77,0.12)',
};

const cancelButtonStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  padding: '5px 8px',
};
