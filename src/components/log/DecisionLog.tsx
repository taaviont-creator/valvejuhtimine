import React from 'react';
import { DecisionLogEntry } from '../../models';
import { formatTime } from '../../lib/calculations';

interface Props {
  entries: DecisionLogEntry[];
}

const actorColors: Record<string, string> = {
  teacher: 'var(--amber)',
  student: 'var(--cyan)',
  system: 'var(--text-muted)',
};

export const DecisionLog: React.FC<Props> = ({ entries }) => {
  if (entries.length === 0) {
    return <div style={emptyStyle}>No log entries yet</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {entries.map((entry) => (
        <div key={entry.id} style={entryStyle}>
          <span style={timeStyle}>{formatTime(entry.createdAt)}</span>
          <span style={{ ...actorStyle, color: actorColors[entry.actor] }}>{entry.actor}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{entry.text}</span>
        </div>
      ))}
    </div>
  );
};

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
  padding: '8px 0',
};

const entryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 7,
  padding: '5px 6px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-card)',
  fontSize: 11,
  lineHeight: 1.35,
};

const timeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
  paddingTop: 1,
};

const actorStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  whiteSpace: 'nowrap',
  paddingTop: 1,
  minWidth: 43,
  textTransform: 'uppercase',
};
