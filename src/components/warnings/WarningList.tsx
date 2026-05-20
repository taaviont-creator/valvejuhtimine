import React from 'react';
import { Warning } from '../../models';

interface Props {
  warnings: Warning[];
}

export const WarningList: React.FC<Props> = ({ warnings }) => {
  if (warnings.length === 0) {
    return <div style={okStyle}>All requirements are currently met</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {warnings.map((warning) => (
        <div key={warning.id} style={warningStyle}>
          <span style={{ color: 'var(--red)', marginRight: 6 }}>!</span>
          {warning.message}
        </div>
      ))}
    </div>
  );
};

const okStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'rgba(0,255,136,0.04)',
  border: '1px solid rgba(0,255,136,0.15)',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--green)',
  letterSpacing: 0.5,
};

const warningStyle: React.CSSProperties = {
  padding: '7px 10px',
  background: 'rgba(255,51,85,0.06)',
  border: '1px solid rgba(255,51,85,0.3)',
  borderLeft: '3px solid var(--red)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 11,
  color: 'var(--text-primary)',
  lineHeight: 1.4,
};
