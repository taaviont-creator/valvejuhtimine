import React, { useMemo, useState } from 'react';
import { AppRole, SetupMode } from '../../models';

interface Props {
  onCreate: (name: string, setupMode: SetupMode, displayName: string) => void;
  onJoin: (joinCode: string, role: AppRole, displayName: string) => Promise<boolean>;
  syncStatus: string;
  syncMessage?: string;
}

export const RoleSelector: React.FC<Props> = ({ onCreate, onJoin, syncStatus, syncMessage }) => {
  const search = useMemo(() => new URLSearchParams(window.location.search), []);
  const [simulationName, setSimulationName] = useState('Demo shift exercise');
  const [teacherName, setTeacherName] = useState('Teacher');
  const [studentName, setStudentName] = useState('Student');
  const [setupMode, setSetupMode] = useState<SetupMode>('teacher_assigned');
  const [joinCode, setJoinCode] = useState(search.get('join') ?? '');
  const [joinRole, setJoinRole] = useState<AppRole>(search.get('role') === 'teacher' ? 'facilitator' : 'commander');
  const [joining, setJoining] = useState(false);

  const join = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    await onJoin(joinCode, joinRole, joinRole === 'facilitator' ? teacherName : studentName);
    setJoining(false);
  };

  return (
    <div style={pageStyle}>
      <div style={{ width: 'min(1040px, calc(100vw - 48px))' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={eyebrowStyle}>Training simulation</div>
          <h1 style={titleStyle}>Prison Shift Resource Simulation</h1>
          <p style={subtitleStyle}>
            Teacher feeds incidents. Student moves limited officer resources. Both views share one live simulation state.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
          <section style={panelStyle}>
            <div style={panelTitleStyle}>Teacher creates simulation</div>
            <Field label="Simulation name">
              <input value={simulationName} onChange={(event) => setSimulationName(event.target.value)} style={inputStyle} />
            </Field>
            <Field label="Teacher name">
              <input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} style={inputStyle} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
              <ModeButton
                title="Mode A"
                text="Teacher pre-assigns officers to starting units."
                active={setupMode === 'teacher_assigned'}
                onClick={() => setSetupMode('teacher_assigned')}
              />
              <ModeButton
                title="Mode B"
                text="Student starts with all officers in the resource pool."
                active={setupMode === 'student_places_officers'}
                onClick={() => setSetupMode('student_places_officers')}
              />
            </div>

            <button style={primaryButtonStyle} onClick={() => onCreate(simulationName, setupMode, teacherName)}>
              Create simulation
            </button>
          </section>

          <section style={panelStyle}>
            <div style={panelTitleStyle}>Join existing simulation</div>
            <Field label="Simulation code">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="VJ-4821"
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: 3 }}
              />
            </Field>
            <Field label="Display name">
              <input
                value={joinRole === 'facilitator' ? teacherName : studentName}
                onChange={(event) => (joinRole === 'facilitator' ? setTeacherName(event.target.value) : setStudentName(event.target.value))}
                style={inputStyle}
              />
            </Field>

            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <RoleButton label="Student" active={joinRole === 'commander'} onClick={() => setJoinRole('commander')} />
              <RoleButton label="Teacher" active={joinRole === 'facilitator'} onClick={() => setJoinRole('facilitator')} />
            </div>

            <button style={primaryButtonStyle} disabled={!joinCode.trim() || joining} onClick={join}>
              {joining ? 'Joining...' : 'Join simulation'}
            </button>
            {(syncMessage || syncStatus === 'local' || syncStatus === 'supabase') && (
              <div style={noteStyle}>
                {syncMessage ?? (syncStatus === 'supabase' ? 'Supabase sync enabled' : 'Local demo mode')}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'block', marginBottom: 12 }}>
    <span style={labelStyle}>{label}</span>
    {children}
  </label>
);

const ModeButton: React.FC<{ title: string; text: string; active: boolean; onClick: () => void }> = ({ title, text, active, onClick }) => (
  <button onClick={onClick} style={{ ...modeButtonStyle, borderColor: active ? 'var(--cyan)' : 'var(--border)' }}>
    <strong style={{ display: 'block', color: active ? 'var(--cyan)' : 'var(--text-primary)', marginBottom: 4 }}>{title}</strong>
    <span>{text}</span>
  </button>
);

const RoleButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{ ...roleButtonStyle, borderColor: active ? 'var(--cyan)' : 'var(--border)', color: active ? 'var(--cyan)' : 'var(--text-secondary)' }}>
    {label}
  </button>
);

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-base)',
  padding: 24,
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--cyan)',
  letterSpacing: 3,
  textTransform: 'uppercase',
  marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 46,
  lineHeight: 1,
  color: 'var(--text-primary)',
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 10,
  maxWidth: 720,
  color: 'var(--text-secondary)',
  fontSize: 15,
};

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 18,
  boxShadow: 'var(--shadow-card)',
};

const panelTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 22,
  color: 'var(--text-primary)',
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-muted)',
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '9px 10px',
  outline: 'none',
};

const modeButtonStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  padding: 12,
  textAlign: 'left',
  lineHeight: 1.35,
};

const roleButtonStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: 8,
  fontFamily: 'var(--font-mono)',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--cyan)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#001017',
  padding: '10px 12px',
  fontFamily: 'var(--font-display)',
  fontSize: 16,
  fontWeight: 700,
};

const noteStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: 'var(--amber)',
  lineHeight: 1.4,
};
