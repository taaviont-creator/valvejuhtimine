import React from 'react';
import { EscortBus, Officer } from '../../models';
import { getBusOfficers } from '../../lib/calculations';

interface Props {
  bus: EscortBus;
  index: number;
  officers: Officer[];
  selected: boolean;
  onClick: () => void;
}

export const BusCard: React.FC<Props> = ({ bus, index, officers, selected, onClick }) => {
  const assigned = getBusOfficers(bus, officers);
  const escortQualified = assigned.filter((officer) => officer.hasEscortPermission).length;
  const hasWarning = assigned.length > 0 && escortQualified < bus.minimumEscortQualified;
  const ready = assigned.length >= bus.minimumEscortQualified && escortQualified >= bus.minimumEscortQualified;

  return (
    <div onClick={onClick} style={cardStyle(index, selected, hasWarning, ready)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>BUS</span>
        <span style={{ ...nameStyle, color: selected ? 'var(--cyan)' : 'var(--text-primary)' }}>{bus.name}</span>
      </div>

      <div style={countRowStyle}>
        <span style={{ ...countStyle, color: hasWarning ? 'var(--amber)' : ready ? 'var(--green)' : 'var(--text-secondary)' }}>{assigned.length}</span>
        <span style={metaStyle}>escort {escortQualified}/{bus.minimumEscortQualified}</span>
      </div>

      <div style={{ ...statusStyle, color: hasWarning ? 'var(--amber)' : ready ? 'var(--green)' : 'var(--text-muted)' }}>
        {assigned.length === 0 ? 'Empty' : hasWarning ? 'Needs escort-qualified officers' : ready ? 'Ready' : 'Waiting'}
      </div>

      {assigned.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 7 }}>
          {assigned.map((officer) => (
            <span key={officer.id} style={chipStyle(officer)}>{officer.name}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const cardStyle = (index: number, selected: boolean, hasWarning: boolean, ready: boolean): React.CSSProperties => ({
  position: 'absolute',
  left: index === 0 ? 60 : 320,
  top: 680,
  width: 190,
  minHeight: 94,
  background: selected ? 'var(--bg-elevated)' : 'var(--bg-card)',
  border: `1px solid ${hasWarning ? 'var(--amber)' : ready ? 'var(--green)' : selected ? 'var(--cyan-dim)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-card)',
  userSelect: 'none',
});

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 13,
  fontWeight: 600,
};

const countRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 4,
};

const countStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 18,
};

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
};

const statusStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const chipStyle = (officer: Officer): React.CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  background: officer.hasEscortPermission ? 'rgba(0,255,136,0.1)' : 'rgba(255,170,0,0.1)',
  border: `1px solid ${officer.hasEscortPermission ? 'var(--green-dim)' : 'var(--amber-dim)'}`,
  color: officer.hasEscortPermission ? 'var(--green)' : 'var(--amber)',
  padding: '1px 4px',
  borderRadius: 3,
});
