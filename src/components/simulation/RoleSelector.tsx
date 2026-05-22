import React, { useMemo, useState } from 'react';
import { AppRole, SetupMode } from '../../models';
import { SimulationManagementPanel } from './SimulationManagementPanel';

interface Props {
  onCreate: (name: string, setupMode: SetupMode, displayName: string) => void;
  onCreateClassroom: (name: string, setupMode: SetupMode, displayName: string, groupCount: number) => void;
  onJoin: (joinCode: string, requestedRole: AppRole | null, displayName: string) => Promise<boolean>;
  onOpenSimulation: (simulationId: string) => Promise<boolean> | boolean;
  syncStatus: string;
  syncMessage?: string;
}

export const RoleSelector: React.FC<Props> = ({ onCreate, onCreateClassroom, onJoin, onOpenSimulation, syncStatus, syncMessage }) => {
  const search = useMemo(() => new URLSearchParams(window.location.search), []);
  const [simulationName, setSimulationName] = useState('Valvejuhtimise õppus');
  const [teacherName, setTeacherName] = useState('Õppejõud');
  const [joinName, setJoinName] = useState('');
  const [setupMode, setSetupMode] = useState<SetupMode>('teacher_assigned');
  const [createMode, setCreateMode] = useState<'single' | 'classroom'>('single');
  const [groupCount, setGroupCount] = useState(6);
  const [joinCode, setJoinCode] = useState(search.get('join') ?? '');
  const requestedRole: AppRole | null = search.get('role') === 'teacher' ? 'facilitator' : search.get('role') === 'student' ? 'commander' : null;
  const [joining, setJoining] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  const join = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    await onJoin(joinCode, requestedRole, joinName);
    setJoining(false);
  };

  return (
    <div style={pageStyle}>
      <div style={{ width: 'min(1040px, calc(100vw - 48px))' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={eyebrowStyle}>Õppesimulatsioon</div>
          <h1 style={titleStyle}>Valvejuhtimise ressursisimulatsioon</h1>
          <p style={subtitleStyle}>
            Õppejõud annab olukorrad ette. Korrapidaja juhib piiratud ametnike ressurssi. Mõlemad vaated on samas simulatsioonis.
          </p>
        </div>

        <div style={homeActionGridStyle}>
          <button
            type="button"
            onClick={() => {
              setManagerOpen(false);
              setCreateMode('single');
            }}
            style={homeActionStyle(createMode === 'single' && !managerOpen)}
          >
            <strong>Loo uus simulatsioon</strong>
            <span>Üks õpetaja ja üks korrapidaja töölaud.</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setManagerOpen(false);
              setCreateMode('classroom');
            }}
            style={homeActionStyle(createMode === 'classroom' && !managerOpen)}
          >
            <strong>Loo mitme grupi harjutus</strong>
            <span>Grupid alustavad ühise algseisuga.</span>
          </button>
          <button
            type="button"
            onClick={() => setManagerOpen((value) => !value)}
            style={homeActionStyle(managerOpen)}
          >
            <strong>Ava loodud simulatsioonid</strong>
            <span>Leia olemasolevad simulatsioonid ja grupiharjutused.</span>
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('join-code-input')?.focus()}
            style={homeActionStyle(false)}
          >
            <strong>Liitu koodiga</strong>
            <span>Õpilase või õpetaja kood avab õige vaate.</span>
          </button>
        </div>

        {managerOpen && (
          <div style={homeManagerStyle}>
            <SimulationManagementPanel
              onOpenSimulation={onOpenSimulation}
              initialCollapsed={false}
              onCreateNew={() => {
                setManagerOpen(false);
                setCreateMode('single');
              }}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
          <section style={panelStyle}>
            <div style={panelTitleStyle}>Õppejõud / läbiviija loob simulatsiooni</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <ModeButton
                title="Loo üks simulatsioon"
                text="Üks korrapidaja vaade ja üks ühine simulatsiooni olek."
                active={createMode === 'single'}
                onClick={() => setCreateMode('single')}
              />
              <ModeButton
                title="Loo mitme grupi harjutus"
                text="Iga grupp saab oma koodi ja eraldi otsuste oleku."
                active={createMode === 'classroom'}
                onClick={() => setCreateMode('classroom')}
              />
            </div>
            <Field label="Simulatsiooni nimi">
              <input value={simulationName} onChange={(event) => setSimulationName(event.target.value)} style={inputStyle} />
            </Field>
            <Field label="Õppejõu nimi">
              <input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} style={inputStyle} />
            </Field>
            {createMode === 'classroom' && (
              <>
                <Field label="Gruppide arv">
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={groupCount}
                    onChange={(event) => setGroupCount(Number(event.target.value))}
                    style={inputStyle}
                  />
                </Field>
                <div style={classroomBaselineStyle}>
                  <strong>Ühine algseis kõigile gruppidele</strong>
                  <span>Kõik grupid alustavad sama üksuste, ametnike, õiguste ja algpaigutusega. Erinevused tekivad ainult gruppide otsustest või õppejõu eraldi sekkumisest.</span>
                  <label style={disabledToggleStyle}>
                    <input type="checkbox" disabled />
                    Kasuta gruppidel erinevat algseisu
                  </label>
                  <span style={disabledNoteStyle}>Erinev algseis lisatakse hiljem.</span>
                </div>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
              <ModeButton
                title="Režiim A"
                text="Õppejõud määrab ametnikud alguses üksustesse."
                active={setupMode === 'teacher_assigned'}
                onClick={() => setSetupMode('teacher_assigned')}
              />
              <ModeButton
                title="Režiim B"
                text="Korrapidaja alustab nii, et kõik ametnikud on valves olevate ametnike all."
                active={setupMode === 'student_places_officers'}
                onClick={() => setSetupMode('student_places_officers')}
              />
            </div>

            <button
              style={primaryButtonStyle}
              onClick={() =>
                createMode === 'classroom'
                  ? onCreateClassroom(simulationName, setupMode, teacherName, groupCount)
                  : onCreate(simulationName, setupMode, teacherName)
              }
            >
              {createMode === 'classroom' ? 'Loo grupid' : 'Loo simulatsioon õppejõuna'}
            </button>
          </section>

          <section style={panelStyle}>
            <div style={panelTitleStyle}>Liitu koodiga</div>
            <Field label="Sisesta kood">
              <input
                id="join-code-input"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="OPIL-9135"
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: 3 }}
              />
            </Field>
            <Field label="Kuvatav nimi">
              <input
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                placeholder="Nimi või roll"
                style={inputStyle}
              />
            </Field>

            <div style={roleNoteStyle}>
              Kood määrab vaate automaatselt: õppejõu kood avab õppejõu vaate ja õpilase kood korrapidaja vaate.
            </div>

            <button style={primaryButtonStyle} disabled={!joinCode.trim() || joining} onClick={join}>
              {joining ? 'Liitumine...' : 'Liitu koodiga'}
            </button>
            {(syncMessage || syncStatus === 'local' || syncStatus === 'supabase') && (
              <div style={noteStyle}>
                {syncMessage ?? (syncStatus === 'supabase' ? 'Supabase sünkroonimine sees' : 'Kohalik demorežiim')}
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

const homeActionGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 10,
  marginBottom: 16,
};

const homeActionStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 86,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  padding: 12,
  border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-md)',
  background: active ? 'rgba(34,121,157,0.10)' : 'var(--bg-panel)',
  color: 'var(--text-secondary)',
  textAlign: 'left',
  lineHeight: 1.25,
  boxShadow: active ? 'var(--shadow-glow)' : 'var(--shadow-card)',
});

const homeManagerStyle: React.CSSProperties = {
  marginBottom: 16,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-card)',
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

const roleNoteStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  padding: '8px 10px',
  marginBottom: 18,
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  lineHeight: 1.35,
};

const classroomBaselineStyle: React.CSSProperties = {
  display: 'grid',
  gap: 5,
  marginBottom: 14,
  padding: '9px 10px',
  background: 'rgba(34,121,157,0.08)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 12,
  lineHeight: 1.35,
};

const disabledToggleStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  marginTop: 4,
  color: 'var(--text-secondary)',
  fontSize: 12,
};

const disabledNoteStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 11,
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
