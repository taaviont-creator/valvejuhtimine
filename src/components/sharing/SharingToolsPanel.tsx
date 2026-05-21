import React, { useMemo, useState } from 'react';
import { ClassroomExercise, Simulation } from '../../models';

interface Props {
  simulation: Simulation;
  classroomExercise: ClassroomExercise | null;
}

type CopyKey = string;

function buildLink(code: string, role: 'teacher' | 'student', groupId?: string) {
  const params = new URLSearchParams({ join: code, role });
  if (groupId) params.set('group', groupId);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export const SharingToolsPanel: React.FC<Props> = ({ simulation, classroomExercise }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
  const teacherCode = classroomExercise?.teacherCode ?? simulation.teacherCode ?? simulation.joinCode;
  const studentCode = simulation.studentCode ?? simulation.joinCode;
  const teacherLink = useMemo(
    () => buildLink(teacherCode, 'teacher', classroomExercise ? simulation.id : undefined),
    [classroomExercise, simulation.id, teacherCode]
  );
  const studentLink = useMemo(() => buildLink(studentCode, 'student'), [studentCode]);

  const copy = async (key: CopyKey, value: string, label: string) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API puudub');
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1600);
    } catch {
      window.prompt(label, value);
    }
  };

  return (
    <section style={panelStyle}>
      <button onClick={() => setCollapsed((value) => !value)} style={headerButtonStyle}>
        <span>Jagamine ja testimine</span>
        <span>{collapsed ? '+' : '-'}</span>
      </button>

      {!collapsed && (
        <div style={bodyStyle}>
          <div style={warningStyle}>
            Ära jaga õppejõu koodi õpilastele. Õpilastele jaga ainult õpilase või grupi linki.
          </div>

          <div style={singleGridStyle}>
            <ShareItem
              label="Õppejõu kood"
              value={teacherCode}
              copyLabel="Kopeeri kood"
              copied={copiedKey === 'teacher-code'}
              onCopy={() => void copy('teacher-code', teacherCode, 'Õppejõu kood')}
            />
            <ShareItem
              label="Õpilase kood"
              value={studentCode}
              copyLabel="Kopeeri kood"
              copied={copiedKey === 'student-code'}
              onCopy={() => void copy('student-code', studentCode, 'Õpilase kood')}
            />
            <ShareItem
              label="Õppejõu link"
              value={teacherLink}
              copyLabel="Kopeeri link"
              copied={copiedKey === 'teacher-link'}
              onCopy={() => void copy('teacher-link', teacherLink, 'Õppejõu link')}
            />
            <ShareItem
              label="Õpilase link"
              value={studentLink}
              copyLabel="Kopeeri link"
              copied={copiedKey === 'student-link'}
              onCopy={() => void copy('student-link', studentLink, 'Õpilase link')}
            />
          </div>

          <div style={noteStyle}>Jaga õpilastele ainult õpilase linki või õpilase koodi.</div>

          {classroomExercise && (
            <div style={groupSectionStyle}>
              <div style={sectionTitleStyle}>Gruppide lingid</div>
              <div style={groupGridStyle}>
                {classroomExercise.groups.map((group) => {
                  const groupLink = buildLink(group.studentCode, 'student');
                  return (
                    <article key={group.simulationId} style={groupCardStyle}>
                      <div style={groupTitleStyle}>{group.groupName}</div>
                      <div style={smallTextStyle}>Õpilase kood: <strong>{group.studentCode}</strong></div>
                      <input value={groupLink} readOnly style={inputStyle} title="Õpilase link" />
                      <div style={buttonRowStyle}>
                        <CopyButton
                          copied={copiedKey === `group-code-${group.simulationId}`}
                          onClick={() => void copy(`group-code-${group.simulationId}`, group.studentCode, `${group.groupName} õpilase kood`)}
                        >
                          Kopeeri kood
                        </CopyButton>
                        <CopyButton
                          copied={copiedKey === `group-link-${group.simulationId}`}
                          onClick={() => void copy(`group-link-${group.simulationId}`, groupLink, `${group.groupName} õpilase link`)}
                        >
                          Kopeeri link
                        </CopyButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const ShareItem: React.FC<{
  label: string;
  value: string;
  copyLabel: string;
  copied: boolean;
  onCopy: () => void;
}> = ({ label, value, copyLabel, copied, onCopy }) => (
  <label style={shareItemStyle}>
    <span style={labelStyle}>{label}</span>
    <div style={valueRowStyle}>
      <input value={value} readOnly style={inputStyle} />
      <CopyButton copied={copied} onClick={onCopy}>{copyLabel}</CopyButton>
    </div>
  </label>
);

const CopyButton: React.FC<{ copied: boolean; onClick: () => void; children: React.ReactNode }> = ({ copied, onClick, children }) => (
  <button onClick={onClick} style={copyButtonStyle(copied)}>
    {copied ? 'Kopeeritud' : children}
  </button>
);

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
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const warningStyle: React.CSSProperties = {
  padding: '7px 9px',
  background: 'rgba(166,111,31,0.08)',
  border: '1px solid var(--amber-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
};

const singleGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 8,
};

const shareItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: 1,
  textTransform: 'uppercase',
  fontWeight: 800,
};

const valueRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 5,
  minWidth: 0,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '5px 7px',
  fontSize: 10,
};

const copyButtonStyle = (copied: boolean): React.CSSProperties => ({
  minHeight: 26,
  background: copied ? 'rgba(39,122,87,0.10)' : 'rgba(34,121,157,0.09)',
  border: `1px solid ${copied ? 'var(--green-dim)' : 'var(--cyan-dim)'}`,
  borderRadius: 'var(--radius-sm)',
  color: copied ? 'var(--green)' : 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  padding: '4px 7px',
  whiteSpace: 'nowrap',
});

const noteStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 10,
};

const groupSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sectionTitleStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-display)',
  fontSize: 17,
  lineHeight: 1,
};

const groupGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 8,
  maxHeight: 170,
  overflowY: 'auto',
};

const groupCardStyle: React.CSSProperties = {
  padding: 8,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

const groupTitleStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 700,
  fontSize: 12,
};

const smallTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 10,
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 5,
};
