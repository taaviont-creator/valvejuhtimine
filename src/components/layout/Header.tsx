import React from 'react';
import { AppRole, Simulation, Warning } from '../../models';

interface Props {
  role: AppRole;
  simulation: Simulation;
  warnings: Warning[];
  syncStatus: string;
  syncMessage?: string;
  onBack: () => void;
  onStart?: () => void;
  onReset?: () => void;
}

export const Header: React.FC<Props> = ({
  role,
  simulation,
  warnings,
  syncStatus,
  syncMessage,
  onBack,
  onStart,
  onReset,
}) => {
  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${simulation.joinCode}&role=student`;
  const syncLabel =
    syncStatus === 'supabase'
      ? 'Supabase sünkroonimine sees'
      : syncStatus === 'local'
      ? 'Kohalik demorežiim'
      : syncStatus === 'loading'
      ? 'Sünkroonimine'
      : 'Sünkroonimise viga';
  const statusLabel = simulation.status === 'setup' ? 'seadistamine' : simulation.status === 'active' ? 'aktiivne' : 'lõpetatud';

  return (
    <div style={headerStyle}>
      <button onClick={onBack} style={ghostButtonStyle}>Välju</button>
      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      <div>
        <div style={nameStyle}>{simulation.name}</div>
        <div style={metaStyle}>{statusLabel} | {simulation.setupMode === 'teacher_assigned' ? 'Režiim A' : 'Režiim B'}</div>
      </div>

      <div style={joinCodeStyle}>
        <span>Simulatsiooni kood</span>
        <strong>{simulation.joinCode}</strong>
      </div>

      <div style={roleStyle(role)}>{role === 'facilitator' ? 'Õppejõud / läbiviija' : 'Korrapidaja / juht'}</div>

      <input value={joinUrl} readOnly title="Korrapidaja liitumislink" style={joinLinkStyle} />

      <div style={{ flex: 1 }} />

      {onStart && simulation.status === 'setup' && (
        <button onClick={onStart} style={primaryButtonStyle}>Käivita</button>
      )}
      {onReset && (
        <button onClick={onReset} style={ghostButtonStyle}>Lähtesta</button>
      )}

      {warnings.length > 0 && (
        <div style={warningStyle}>{warnings.length} hoiatus{warnings.length === 1 ? '' : 't'}</div>
      )}

      <div title={syncMessage} style={{ ...liveStyle, color: syncStatus === 'error' ? 'var(--red)' : 'var(--green)' }}>
        <span style={{ ...dotStyle, background: syncStatus === 'error' ? 'var(--red)' : 'var(--green)' }} />
        {syncLabel}
      </div>
    </div>
  );
};

const headerStyle: React.CSSProperties = {
  height: 52,
  background: 'var(--bg-panel)',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  gap: 12,
  flexShrink: 0,
};

const ghostButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  padding: '5px 9px',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const primaryButtonStyle: React.CSSProperties = {
  ...ghostButtonStyle,
  background: 'var(--cyan)',
  borderColor: 'var(--cyan)',
  color: '#001017',
  fontWeight: 700,
};

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  color: 'var(--text-primary)',
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1,
};

const metaStyle: React.CSSProperties = {
  marginTop: 3,
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};

const roleStyle = (role: AppRole): React.CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: 1.5,
  padding: '4px 8px',
  borderRadius: 3,
  background: role === 'facilitator' ? 'rgba(255,170,0,0.12)' : 'rgba(0,212,255,0.12)',
  border: `1px solid ${role === 'facilitator' ? 'var(--amber-dim)' : 'var(--cyan-dim)'}`,
  color: role === 'facilitator' ? 'var(--amber)' : 'var(--cyan)',
  textTransform: 'uppercase',
});

const joinCodeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '5px 9px',
  background: 'rgba(0,212,255,0.1)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};

const joinLinkStyle: React.CSSProperties = {
  width: 285,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
  padding: '5px 8px',
  fontSize: 11,
};

const warningStyle: React.CSSProperties = {
  padding: '4px 9px',
  background: 'rgba(255,51,85,0.1)',
  border: '1px solid rgba(255,51,85,0.4)',
  borderRadius: 3,
  color: 'var(--red)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const liveStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: 1,
};

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  display: 'inline-block',
};
